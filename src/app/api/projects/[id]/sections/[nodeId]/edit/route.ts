import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { safeParse } from "@/lib/utils"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens, EditorData, Node } from "@/lib/editor/types"
import { createBlankEditorData } from "@/lib/editor/node-ops"
import { aiProvider } from "@/lib/ai/zai-provider"
import type { SectionEditInput } from "@/lib/ai/section-schemas"
import type { AiTreeNode } from "@/lib/ai/provider"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum instruction length (after trim). */
const MIN_INSTRUCTION = 3
/** Maximum instruction length (after trim). */
const MAX_INSTRUCTION = 1000
/** Max sibling sections included for AI context (keeps the prompt small). */
const MAX_SIBLING_CONTEXT = 8

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert the editor's flat id-based Node subtree (rooted at `id`) into the
 * nested `AiTreeNode` shape the AI provider expects.
 *
 * Server-side only; mirrors the conceptual inverse of `flattenTree()`. We do
 * NOT use `flattenTree` here — that assigns fresh ids and is for whole-page
 * generation. Here we need to READ the current nested state of one node.
 */
function toNestedTreeNode(
  nodes: Record<string, Node>,
  id: string
): AiTreeNode | null {
  const node = nodes[id]
  if (!node) return null
  return {
    type: node.type,
    props: node.props,
    styles: node.styles,
    children: node.children
      .map((cid) => toNestedTreeNode(nodes, cid))
      .filter((c): c is AiTreeNode => c !== null),
  }
}

/**
 * Build a lightweight sibling-context list for AI coherence.
 *
 * Walks the selected node's parent's children (the sections beside it on the
 * page) and returns `{ type, heading? }` for each sibling EXCEPT the selected
 * node itself. `heading` is extracted heuristically from the sibling's props
 * (heading/headline/eyebrow/text/brand) so the AI can keep copy consistent.
 *
 * Capped at MAX_SIBLING_CONTEXT entries. Only top-level page sections are
 * considered (siblings of the selected node), never the whole page.
 */
function buildSiblingContext(
  nodes: Record<string, Node>,
  selectedId: string
): { type: string; heading?: string }[] {
  const selected = nodes[selectedId]
  if (!selected || !selected.parent) return []
  const parent = nodes[selected.parent]
  if (!parent) return []

  const out: { type: string; heading?: string }[] = []
  for (const siblingId of parent.children) {
    if (siblingId === selectedId) continue
    const sib = nodes[siblingId]
    if (!sib) continue
    // Try to surface a human label from common prop keys.
    const p = sib.props as Record<string, unknown>
    const heading =
      (typeof p.heading === "string" && p.heading) ||
      (typeof p.headline === "string" && p.headline) ||
      (typeof p.eyebrow === "string" && p.eyebrow) ||
      (typeof p.text === "string" && p.text) ||
      (typeof p.brand === "string" && p.brand) ||
      undefined
    out.push({ type: sib.type, heading })
    if (out.length >= MAX_SIBLING_CONTEXT) break
  }
  return out
}

/**
 * Resolve a top-level-ish "business name" for voice consistency.
 * Prefers the project name (always present), falls back to the website name.
 */
function resolveBusinessName(projectName: string, websiteName?: string | null): string | undefined {
  return projectName || websiteName || undefined
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/projects/[id]/sections/[nodeId]/edit
 *
 * AI section editing. The server loads the current node state + design tokens
 * + sibling context from the database, calls `aiProvider.editSection`, and
 * returns the validated patch. The endpoint NEVER persists the change —
 * the client applies it via the editor store (preview → apply → undo → save).
 *
 * Security: authenticated owner check, node-existence check, root-protection,
 * client cannot spoof node state (only `instruction` is accepted from the
 * request body).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  // ---- 1. Authentication ----
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: projectId, nodeId } = await params

  // ---- 2. Project ownership (403 if exists but not owned, 404 if absent) ----
  // First: does the project exist at all?
  const exists = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!exists) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }
  // Then: does this user own it?
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true, name: true, businessType: true },
  })
  if (!project) {
    return NextResponse.json(
      { error: "Forbidden: you do not own this project" },
      { status: 403 }
    )
  }

  // ---- 3. Parse + validate the request body ----
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const instruction =
    typeof (body as { instruction?: unknown })?.instruction === "string"
      ? ((body as { instruction: string }).instruction).trim()
      : ""
  if (instruction.length < MIN_INSTRUCTION) {
    return NextResponse.json(
      { error: `Instruction must be at least ${MIN_INSTRUCTION} characters` },
      { status: 400 }
    )
  }
  if (instruction.length > MAX_INSTRUCTION) {
    return NextResponse.json(
      { error: `Instruction must be at most ${MAX_INSTRUCTION} characters` },
      { status: 400 }
    )
  }

  // ---- 4. Load the website + home page (MVP convention) ----
  const website = await db.website.findUnique({ where: { projectId } })
  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }
  const page = await db.page.findUnique({
    where: { websiteId_slug: { websiteId: website.id, slug: "home" } },
  })
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 })
  }

  // ---- 5. Parse editorData + find the selected node ----
  const editorData = safeParse<EditorData>(page.editorData, createBlankEditorData())
  const selectedNode = editorData.nodes[nodeId]
  if (!selectedNode) {
    return NextResponse.json(
      { error: "Node not found in this page" },
      { status: 404 }
    )
  }

  // ---- 6. Root protection: the root node must never be AI-edited ----
  if (nodeId === editorData.rootId || selectedNode.parent === null) {
    return NextResponse.json(
      { error: "The page root cannot be AI-edited. Select a section instead." },
      { status: 400 }
    )
  }

  // ---- 7. Build the AI input from server-side state ----
  const currentNode = toNestedTreeNode(editorData.nodes, nodeId)
  if (!currentNode) {
    // Should not happen after the existence check, but guard anyway.
    return NextResponse.json({ error: "Node not found in this page" }, { status: 404 })
  }
  const designTokens = safeParse<DesignTokens>(website.globalStyles, defaultDesignTokens)
  const pageContext = buildSiblingContext(editorData.nodes, nodeId)
  const businessName = resolveBusinessName(project.name, website.name)

  const aiInput: SectionEditInput = {
    instruction,
    nodeType: selectedNode.type,
    currentNode,
    designTokens,
    pageContext,
    businessName,
  }

  // ---- 8. Call the AI provider (abstraction, not ZAIProvider directly) ----
  try {
    const patch = await aiProvider.editSection(aiInput)
    // The provider already Zod-validated the output (incl. type preservation
    // + all Phase 2.2 safety checks). We return it as-is; no persistence.
    return NextResponse.json({ patch })
  } catch (err) {
    // Provider/validation failure. Return a safe message — do not leak
    // API keys, stack traces, or the full AI response.
    const message =
      err instanceof Error ? err.message : "AI section edit failed"
    // Keep the message useful but bounded — some provider errors include a
    // response snippet for debugging; cap it so we never dump huge blobs.
    const safe = message.length > 800 ? message.slice(0, 800) + "…" : message
    return NextResponse.json(
      { error: "AI section edit failed", detail: safe },
      { status: 500 }
    )
  }
}

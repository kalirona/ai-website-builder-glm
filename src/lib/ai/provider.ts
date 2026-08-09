// server-only module — imported by API route handlers, never by client code.

import type { EditorData, Node, DesignTokens } from "@/lib/editor/types"
import type { GenerateWebsiteInput } from "./schemas"
import { genId } from "@/lib/utils"

/**
 * A node in the AI-produced nested tree.
 *
 * The AI emits `children` as full node objects (NOT id strings). The
 * `flattenTree()` function below converts this nested shape into the flat
 * id-based `EditorData` the editor store expects.
 */
export interface AiTreeNode {
  type: string
  props: Record<string, unknown>
  styles?: Record<string, unknown>
  children: AiTreeNode[]
}

/**
 * A single generated page, with its nested node tree flattened into the
 * editor's id-based `EditorData` format.
 */
export interface GeneratedPageResult {
  name: string
  slug: string
  title?: string
  description?: string
  editorData: EditorData
}

/**
 * The fully-validated result returned by `AIProvider.generateWebsite`.
 * This is what the API route handler persists to the database.
 */
export interface GenerateWebsiteResult {
  websiteName: string
  domain?: string
  designTokens: DesignTokens
  navigation: { label: string; url: string }[]
  pages: GeneratedPageResult[]
}

/**
 * Pluggable AI provider interface. `ZAIProvider` is the default impl
 * (z-ai-web-dev-sdk). Other implementations (OpenAI, Gemini, n8n) can
 * satisfy this interface without touching call sites.
 */
export interface AIProvider {
  generateWebsite(input: GenerateWebsiteInput): Promise<GenerateWebsiteResult>
  // Phase-2 placeholders (not implemented in Phase 1):
  generateSection?(input: unknown): Promise<unknown>
  rewriteContent?(input: unknown): Promise<unknown>
}

/**
 * Convert the AI's nested component tree into the flat id-based
 * `EditorData` (nodes map + rootId) consumed by the editor store.
 *
 * - The root of the page tree is assigned id `"root"` with parent `null`.
 * - Every other node gets a unique id via `genId(type.toLowerCase())`
 *   (matching the convention used in `node-ops.ts`).
 * - `children` becomes an array of child id strings; `parent` is set to
 *   the parent node's id.
 */
export function flattenTree(tree: AiTreeNode): EditorData {
  const nodes: Record<string, Node> = {}

  function walk(node: AiTreeNode, id: string, parent: string | null): void {
    // Pre-assign ids for this node's children so we can populate the
    // `children` array on the parent before recursing.
    const childIds = node.children.map((child) =>
      genId(safePrefix(child.type))
    )

    nodes[id] = {
      id,
      type: node.type,
      props: node.props,
      styles: node.styles ?? {},
      children: childIds,
      parent,
    }

    for (let i = 0; i < node.children.length; i++) {
      walk(node.children[i], childIds[i], id)
    }
  }

  walk(tree, "root", null)
  return { nodes, rootId: "root" }
}

/**
 * Build a safe genId prefix from a component type.
 * "Hero" -> "hero", "CTA" -> "cta", "My-Component" -> "mycomponent".
 * Falls back to "n" if the type is empty/blank.
 */
function safePrefix(type: string): string {
  const cleaned = (type || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return cleaned || "n"
}

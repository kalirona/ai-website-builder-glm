/**
 * Section-edit schemas for AI section-level editing (Phase 2.2).
 *
 * This module defines the validated data contract between the (future)
 * API endpoint, the (future) AI provider method, and the (future) editor
 * store action. Phase 2.2 implements ONLY this schema module — no UI,
 * no store changes, no API route, no AI calls.
 *
 * Design goals
 * ------------
 *  - Reuse the existing recursive `nodeSchema` and `designTokensSchema`
 *    (from `./schemas`) so there is a single source of truth for the
 *    node and design-token shapes. The flat `Node`/`EditorData` editor
 *    types are NOT duplicated here.
 *  - The AI output is a structured PATCH against the selected node —
 *    never HTML, never executable JavaScript, never editor node ids.
 *  - The selected component's type is preserved: validated at runtime
 *    against the expected type via `sectionEditOutputSchemaFor()`.
 *
 * Safety enforced by this schema
 * ------------------------------
 *  1. Structure: `mode` + `node` (nested AiTreeNode) + `summary`.
 *  2. No editor-internal fields: `id` / `parent` are rejected anywhere
 *     in the subtree (they are assigned by the editor, never by the AI).
 *  3. No executable JavaScript or arbitrary HTML: every string value in
 *     the output is scanned for script tags, JS pseudo-URLs, inline event
 *     handlers, and HTML markup.
 *  4. Bounded size: total node count and depth are capped to prevent the
 *     model from emitting an oversized/deeply-nested tree.
 *  5. Type preservation: `node.type` must equal the selected component's
 *     type (checked via the `sectionEditOutputSchemaFor()` factory).
 */

import { z } from "zod"
import type { AiTreeNode } from "./provider"
import { nodeSchema, designTokensSchema } from "./schemas"

// ===========================================================================
// Input — what the (future) API route builds and hands to the AI provider.
// ===========================================================================

/**
 * Lightweight descriptor for a sibling section, used to give the AI page
 * context so its rewrite stays coherent with surrounding sections.
 *
 * Intentionally NOT a full `nodeSchema` — we only need the type and an
 * optional heading, not the entire subtree. This keeps the prompt small.
 */
const sectionContextItemSchema = z.object({
  type: z.string().min(1),
  /** Short label/heading of the sibling, for copy coherence. */
  heading: z.string().optional(),
})

/**
 * Zod schema for a section-edit request.
 *
 * `currentNode` reuses the existing recursive `nodeSchema` (nested subtree,
 * children as objects — NOT editor ids). `designTokens` reuses
 * `designTokensSchema` for brand context. `pageContext` is an optional list
 * of sibling summaries.
 */
export const sectionEditInputSchema = z.object({
  /** The user's natural-language instruction, e.g. "make this more premium". */
  instruction: z.string().min(1).max(1000),
  /** The type of the selected component, e.g. "Hero". */
  nodeType: z.string().min(1),
  /** The selected node as a nested subtree (its current state). */
  currentNode: nodeSchema,
  /** Global design tokens for brand/color context. */
  designTokens: designTokensSchema,
  /** Optional sibling summaries for cross-section coherence. */
  pageContext: z.array(sectionContextItemSchema).max(20).optional(),
  /** Optional business name for voice consistency. */
  businessName: z.string().min(1).optional(),
})

/**
 * Input passed to `AIProvider.editSection()` (to be implemented in a later
 * phase). Inferred from `sectionEditInputSchema` so the type and the runtime
 * validation can never drift apart.
 */
export type SectionEditInput = z.infer<typeof sectionEditInputSchema>

// ===========================================================================
// Output — what the AI returns. Validated before it ever touches the editor.
// ===========================================================================

/**
 * Patch mode for this Phase 2.2 implementation, fixed to `"merge"`:
 *
 *  - The returned `node`'s `props` are shallow-merged into the existing
 *    node's props (so only the fields the AI returns are overwritten;
 *    untouched fields survive).
 *  - The returned `node`'s `styles` are shallow-merged the same way.
 *  - The returned `node`'s `children` (if any) replace the existing
 *    children; the (future) apply step regenerates descendant ids.
 *  - The selected node's `id`, `type`, and `parent` are ALWAYS preserved
 *    by the apply step — the AI cannot change them.
 *
 * `"replace"` mode is intentionally omitted to keep this first cut simple;
 * it can be added in a later phase by widening this literal.
 */
export const sectionEditModeSchema = z.literal("merge")

// ---- safety helpers ------------------------------------------------------

/** Recursively collect every string value in a node's props/styles/children. */
function collectStringValues(node: AiTreeNode): string[] {
  const out: string[] = []
  const visit = (v: unknown): void => {
    if (typeof v === "string") {
      out.push(v)
    } else if (Array.isArray(v)) {
      v.forEach(visit)
    } else if (v && typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(visit)
    }
  }
  visit(node.props)
  if (node.styles) visit(node.styles)
  for (const child of node.children) {
    out.push(child.type)
    out.push(...collectStringValues(child))
  }
  return out
}

/** Total node count in a subtree (defense against oversized AI output). */
function countNodes(node: AiTreeNode): number {
  return 1 + node.children.reduce((n, c) => n + countNodes(c), 0)
}

/** Maximum depth of a subtree. */
function maxDepth(node: AiTreeNode): number {
  if (node.children.length === 0) return 1
  return 1 + Math.max(...node.children.map(maxDepth))
}

/**
 * Patterns that indicate executable JavaScript or arbitrary HTML markup.
 * Matched case-insensitively against every string value in the AI output.
 *
 *  - `<script`, `<iframe`, `<object`, `<embed`  → dangerous embeds
 *  - `javascript:`                              → JS pseudo-URLs
 *  - `on\w+\s*=`                                → inline event handlers (onclick=, onerror=, …)
 *  - `<[a-z][^>]*>`                             → any HTML tag like <div>, <span>, <p>
 *
 * The final pattern requires a closing `>` so harmless prose such as
 * "a < b" or "prices < $100" is not flagged.
 */
const UNSAFE_CONTENT_PATTERN =
  /<\s*script|<\s*iframe|<\s*object|<\s*embed|javascript:|on\w+\s*=|<\s*[a-z][^>]*>/i

function containsUnsafeContent(node: AiTreeNode): boolean {
  return collectStringValues(node).some((s) => UNSAFE_CONTENT_PATTERN.test(s))
}

/**
 * Editor-internal fields the AI must never set. `id` and `parent` are
 * assigned by the editor's apply/flattening step, never by the model.
 * Their presence means the AI is trying to forge editor identity (or was
 * confused about the schema). Because `nodeSchema` uses `.passthrough()`,
 * such fields would otherwise survive parsing — this check rejects them.
 */
function containsEditorInternalFields(node: AiTreeNode): boolean {
  if ("id" in node || "parent" in node) return true
  return node.children.some(containsEditorInternalFields)
}

/** Cap on total nodes in a single AI section patch. */
const MAX_SECTION_NODES = 100
/** Cap on nesting depth in a single AI section patch. */
const MAX_SECTION_DEPTH = 6

/**
 * Base output schema: structure + all safety checks. Does NOT yet enforce
 * that the node type matches the selected component — that requires the
 * runtime expected type, so use `sectionEditOutputSchemaFor()` for it.
 */
export const sectionEditOutputSchema = z
  .object({
    mode: sectionEditModeSchema,
    /** The new subtree for the selected node (nested; no editor ids). */
    node: nodeSchema,
    /** Human-readable summary of what changed (shown in the preview diff). */
    summary: z.string().min(1).max(500),
  })
  .superRefine((data, ctx) => {
    if (containsEditorInternalFields(data.node)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "AI output must not include editor-internal fields (id/parent). These are assigned by the editor.",
        path: ["node"],
      })
    }
    if (containsUnsafeContent(data.node)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "AI output contains forbidden content (executable JavaScript or HTML markup). Only plain text is allowed.",
        path: ["node"],
      })
    }
    const count = countNodes(data.node)
    if (count > MAX_SECTION_NODES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AI output is too large: ${count} nodes (max ${MAX_SECTION_NODES}).`,
        path: ["node"],
      })
    }
    const depth = maxDepth(data.node)
    if (depth > MAX_SECTION_DEPTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AI output is too deep: ${depth} levels (max ${MAX_SECTION_DEPTH}).`,
        path: ["node"],
      })
    }
  })

/**
 * Schema factory that additionally enforces the returned node's `type`
 * matches the selected component's type. The component type must be
 * preserved — the AI edits a section, it does not transmute it into a
 * different component.
 *
 * Usage (in the future API route):
 *
 * ```ts
 * const schema = sectionEditOutputSchemaFor(selectedNode.type)
 * const result = schema.safeParse(rawAiOutput)
 * if (!result.success) { /* surface zod issues *\/ }
 * ```
 */
export function sectionEditOutputSchemaFor(expectedNodeType: string) {
  return sectionEditOutputSchema.superRefine((data, ctx) => {
    if (data.node.type !== expectedNodeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Node type mismatch: AI returned "${data.node.type}" but expected "${expectedNodeType}". The component type must be preserved.`,
        path: ["node", "type"],
      })
    }
  })
}

/** The validated AI section-edit output. */
export type SectionEditOutput = z.infer<typeof sectionEditOutputSchema>

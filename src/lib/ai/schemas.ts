import { z } from "zod"
import type { AiTreeNode } from "./provider"

/**
 * Input collected from the user (dashboard "Generate Website" form).
 * Used to drive AI prompt construction.
 */
export interface GenerateWebsiteInput {
  businessName: string
  businessType: string
  targetAudience?: string
  services?: string
  location?: string
  stylePreference?: string
  primaryGoal?: string
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

/**
 * Validates the AI-produced design-token palette.
 * All color fields are strings (hex expected). Font fields are optional
 * because the editor has sensible defaults.
 */
export const designTokensSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  foreground: z.string().min(1),
  muted: z.string().min(1),
  border: z.string().min(1),
  radius: z.string().min(1),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const navItemSchema = z.object({
  label: z.string().min(1),
  url: z.string(),
})

// ---------------------------------------------------------------------------
// Recursive node tree
// ---------------------------------------------------------------------------

/**
 * Recursive zod schema for an AI-produced component node.
 *
 * The AI emits a NESTED tree (children are full node objects, not ids).
 * A separate `flattenTree()` function in `./provider` converts this into the
 * flat id-based `EditorData` consumed by the editor store.
 *
 * `.passthrough()` keeps any unknown props/extra fields so a slightly
 * off-spec AI response still loads rather than hard-failing — but the
 * required structure (type/props/styles/children) is enforced.
 */
export const nodeSchema: z.ZodType<AiTreeNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      props: z.record(z.string(), z.unknown()),
      styles: z.record(z.string(), z.unknown()).optional(),
      children: z.array(nodeSchema),
    })
    .passthrough()
)

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const generatedPageSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  nodes: nodeSchema,
})

// ---------------------------------------------------------------------------
// Top-level AI output
// ---------------------------------------------------------------------------

export const generateWebsiteOutputSchema = z.object({
  websiteName: z.string().min(1),
  domain: z.string().optional(),
  designTokens: designTokensSchema,
  navigation: z.array(navItemSchema),
  pages: z.array(generatedPageSchema).min(1),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type GenerateWebsiteOutput = z.infer<typeof generateWebsiteOutputSchema>
export type DesignTokensOutput = z.infer<typeof designTokensSchema>
export type NavItemOutput = z.infer<typeof navItemSchema>
export type GeneratedPageOutput = z.infer<typeof generatedPageSchema>

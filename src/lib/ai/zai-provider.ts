// server-only module — imported exclusively by API route handlers.
// Never import this file (or anything that re-exports it) from client code;
// z-ai-web-dev-sdk must remain server-side.

import ZAI from "z-ai-web-dev-sdk"

import type { DesignTokens } from "@/lib/editor/types"
import type { AIProvider, GenerateWebsiteResult } from "./provider"
import { flattenTree } from "./provider"
import type { GenerateWebsiteInput } from "./schemas"
import { generateWebsiteOutputSchema } from "./schemas"
import { buildGenerateWebsiteSystemPrompt, buildGenerateWebsiteUserPrompt } from "./prompts"
import type { SectionEditInput, SectionEditOutput } from "./section-schemas"
import { sectionEditOutputSchemaFor } from "./section-schemas"
import { buildSectionEditSystemPrompt, buildSectionEditUserPrompt } from "./section-prompts"
import { stripCodeFences, parseJsonLoose } from "./json-utils"

/** Default font fallback when the AI omits headingFont/bodyFont. */
const DEFAULT_HEADING_FONT = "var(--font-geist-sans)"
const DEFAULT_BODY_FONT = "var(--font-geist-sans)"

/**
 * ZAI (z-ai-web-dev-sdk) implementation of the AIProvider interface.
 *
 * Calls the chat completions endpoint with a strict system prompt that
 * forces a JSON-only response, then validates the output against the
 * zod schema before returning it to the caller.
 */
export class ZAIProvider implements AIProvider {
  async generateWebsite(input: GenerateWebsiteInput): Promise<GenerateWebsiteResult> {
    const systemPrompt = buildGenerateWebsiteSystemPrompt()
    const userPrompt = buildGenerateWebsiteUserPrompt(input)

    // 1. Call the ZAI chat completions endpoint.
    //    NOTE: per the z-ai-web-dev-sdk API, the system prompt is sent with
    //    role "assistant" (not "system").
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    })

    // 2. Extract the text content.
    const rawText: unknown = completion?.choices?.[0]?.message?.content
    if (!rawText || typeof rawText !== "string") {
      throw new Error("AI provider returned an empty or non-string response.")
    }

    // 3. Strip markdown code fences if the model added them despite instructions.
    const cleaned = stripCodeFences(rawText)

    // 4. Parse JSON — retry once by extracting the outermost {...} block
    //    if the model prefixed/suffixed any preamble.
    const parsed = parseJsonLoose(cleaned)

    // 5. Validate against the zod schema.
    const result = generateWebsiteOutputSchema.safeParse(parsed)
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join(".") : "(root)"
          return `  - path: ${path} | message: ${issue.message}`
        })
        .join("\n")
      throw new Error(
        `AI output failed schema validation.\nIssues:\n${issues}\n\n` +
          `First 500 chars of cleaned response:\n${cleaned.slice(0, 500)}`
      )
    }

    const data = result.data

    // 6. Map to GenerateWebsiteResult. Cast designTokens to DesignTokens
    //    (the validated shape matches; defaults fill in optional fonts).
    const designTokens: DesignTokens = {
      primary: data.designTokens.primary,
      secondary: data.designTokens.secondary,
      accent: data.designTokens.accent,
      background: data.designTokens.background,
      foreground: data.designTokens.foreground,
      muted: data.designTokens.muted,
      border: data.designTokens.border,
      radius: data.designTokens.radius,
      headingFont: data.designTokens.headingFont ?? DEFAULT_HEADING_FONT,
      bodyFont: data.designTokens.bodyFont ?? DEFAULT_BODY_FONT,
    }

    // 7. Flatten each page's nested tree into the editor's id-based format.
    const pages = data.pages.map((page) => ({
      name: page.name,
      slug: page.slug,
      title: page.title,
      description: page.description,
      editorData: flattenTree(page.nodes),
    }))

    return {
      websiteName: data.websiteName,
      domain: data.domain,
      designTokens,
      navigation: data.navigation,
      pages,
    }
  }

  /**
   * Edit a single selected component in place (Phase 2.3).
   *
   * Calls the ZAI chat completions endpoint with the section-edit system +
   * user prompts, then validates the response against the Phase 2.2 schema
   * (including the type-preservation check via `sectionEditOutputSchemaFor`).
   *
   * Never returns unvalidated AI output. Throws with the zod issues if the
   * response fails validation.
   */
  async editSection(input: SectionEditInput): Promise<SectionEditOutput> {
    const systemPrompt = buildSectionEditSystemPrompt()
    const userPrompt = buildSectionEditUserPrompt(input)

    // 1. Call the ZAI chat completions endpoint.
    //    Per the z-ai-web-dev-sdk API, the system prompt is sent with
    //    role "assistant" (not "system") — same convention as generateWebsite.
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    })

    // 2. Extract the text content.
    const rawText: unknown = completion?.choices?.[0]?.message?.content
    if (!rawText || typeof rawText !== "string") {
      throw new Error("AI provider returned an empty or non-string response for editSection.")
    }

    // 3. Strip markdown code fences if present, then parse JSON (with retry).
    const cleaned = stripCodeFences(rawText)
    const parsed = parseJsonLoose(cleaned)

    // 4. Validate against the section-edit schema, including the
    //    type-preservation check. The factory builds a schema that rejects
    //    outputs whose node.type !== input.nodeType.
    const schema = sectionEditOutputSchemaFor(input.nodeType)
    const result = schema.safeParse(parsed)
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join(".") : "(root)"
          return `  - path: ${path} | message: ${issue.message}`
        })
        .join("\n")
      throw new Error(
        `AI section-edit output failed schema validation.\n` +
          `Expected node type: ${input.nodeType}\n` +
          `Issues:\n${issues}\n\n` +
          `First 500 chars of cleaned response:\n${cleaned.slice(0, 500)}`
      )
    }

    return result.data
  }

  // Phase-2 placeholder — still not implemented.
  async rewriteContent(_input: unknown): Promise<unknown> {
    throw new Error("rewriteContent: not implemented (Phase 2)")
  }
}

/** Default singleton provider instance used by API routes. */
export const aiProvider: AIProvider = new ZAIProvider()

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

  // Phase-2 placeholders — explicitly not implemented.
  async generateSection(_input: unknown): Promise<unknown> {
    throw new Error("generateSection: not implemented (Phase 2)")
  }

  async rewriteContent(_input: unknown): Promise<unknown> {
    throw new Error("rewriteContent: not implemented (Phase 2)")
  }
}

/**
 * Strip leading/trailing markdown code fences.
 * Handles ```json ... ``` and ``` ... ``` forms.
 */
function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json|JSON)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim()
}

/**
 * Parse JSON with a single retry: if the first parse fails, extract the
 * substring from the first "{" to the last "}" and try again. This
 * handles models that wrap JSON in a sentence like "Here is the result: {...}".
 *
 * Throws if both attempts fail.
 */
function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (firstErr) {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(
        `AI response is not valid JSON and contains no JSON object boundary. ` +
          `First parse error: ${(firstErr as Error).message}`
      )
    }
    const slice = text.slice(start, end + 1)
    try {
      return JSON.parse(slice)
    } catch (secondErr) {
      throw new Error(
        `AI response is not valid JSON. ` +
          `First parse error: ${(firstErr as Error).message}. ` +
          `Second parse error (extracted {...}): ${(secondErr as Error).message}`
      )
    }
  }
}

/** Default singleton provider instance used by API routes. */
export const aiProvider: AIProvider = new ZAIProvider()

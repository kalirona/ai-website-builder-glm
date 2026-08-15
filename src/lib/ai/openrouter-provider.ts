// server-only module — imported exclusively by the provider resolver.
// Never import this file from client code; OPENROUTER_API_KEY must never
// reach the browser bundle.

import type { AIProvider, GenerateWebsiteResult } from "./provider"
import type { SectionEditInput, SectionEditOutput } from "./section-schemas"
import { sectionEditOutputSchemaFor } from "./section-schemas"
import { buildSectionEditSystemPrompt, buildSectionEditUserPrompt } from "./section-prompts"
import { stripCodeFences, parseJsonLoose } from "./json-utils"

/**
 * OpenRouter implementation of the AIProvider interface.
 *
 * Uses the OpenRouter Chat Completions API (OpenAI-compatible) to call any
 * model — including GLM (e.g. `thudm/glm-4-9b-chat` or `z-ai/glm-4.5`).
 *
 * Configuration (env vars):
 *  - OPENROUTER_API_KEY: required (server-only, never exposed to client)
 *  - OPENROUTER_MODEL: the model to use (e.g. "z-ai/glm-4.5")
 *  - OPENROUTER_BASE_URL: optional, defaults to "https://openrouter.ai/api/v1"
 *
 * Like ZAIProvider, this never returns unvalidated AI output — every response
 * is parsed + Zod-validated against `sectionEditOutputSchemaFor(nodeType)`.
 */
export class OpenRouterProvider implements AIProvider {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || ""
    this.model = process.env.OPENROUTER_MODEL || "z-ai/glm-4.5"
    this.baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
    if (!this.apiKey) {
      throw new Error(
        "OpenRouterProvider: OPENROUTER_API_KEY is not set. " +
          "Add it to .env (server-side only)."
      )
    }
  }

  /** Returns the configured model name (for the dev indicator). */
  getModel(): string {
    return this.model
  }

  /**
   * Call the OpenRouter chat completions endpoint (OpenAI-compatible).
   * Returns the raw text content from the first choice.
   */
  private async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        // OpenRouter recommends these optional headers for ranking/attrib:
        "HTTP-Referer": "https://webcraft.app",
        "X-Title": "Webcraft AI Website Builder",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        // Force JSON output where possible
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `OpenRouter API error: ${res.status} ${res.statusText}. ` +
          `Model: ${this.model}. Body: ${body.slice(0, 300)}`
      )
    }

    const data = await res.json()
    const content: unknown = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      throw new Error(
        "OpenRouter returned an empty or non-string response. " +
          `Model: ${this.model}.`
      )
    }
    return content
  }

  /**
   * Edit a single selected component in place (Phase 2.3 contract).
   *
   * Same flow as ZAIProvider.editSection:
   *  1. Build system + user prompts (reused from section-prompts.ts)
   *  2. Call the model via OpenRouter
   *  3. Strip code fences + parse JSON (reused from json-utils.ts)
   *  4. Validate with sectionEditOutputSchemaFor(input.nodeType)
   *  5. Return only validated SectionEditOutput
   */
  async editSection(input: SectionEditInput): Promise<SectionEditOutput> {
    const systemPrompt = buildSectionEditSystemPrompt()
    const userPrompt = buildSectionEditUserPrompt(input)

    // 1. Call OpenRouter
    const rawText = await this.chat(systemPrompt, userPrompt)

    // 2. Strip markdown code fences + parse JSON (with retry)
    const cleaned = stripCodeFences(rawText)
    const parsed = parseJsonLoose(cleaned)

    // 3. Validate against the section-edit schema (incl. type preservation)
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
        `OpenRouter section-edit output failed schema validation.\n` +
          `Model: ${this.model}\n` +
          `Expected node type: ${input.nodeType}\n` +
          `Issues:\n${issues}\n\n` +
          `First 500 chars of cleaned response:\n${cleaned.slice(0, 500)}`
      )
    }

    return result.data
  }

  /**
   * Generate a full website (Phase 1 contract).
   *
   * For this phase, OpenRouterProvider delegates to the ZAI provider for
   * website generation (which is a larger, more complex prompt). Section
   * editing is the primary OpenRouter use case. If you want OpenRouter to
   * handle full website generation too, implement it here using the same
   * chat() + validation pattern.
   */
  async generateWebsite(input: import("./schemas").GenerateWebsiteInput): Promise<GenerateWebsiteResult> {
    // Delegate to ZAI for full website generation (the generate prompt is
    // large and complex; section editing is the OpenRouter focus for now).
    const { ZAIProvider } = await import("./zai-provider")
    return new ZAIProvider().generateWebsite(input)
  }

  // Phase-2 placeholder
  async rewriteContent(_input: unknown): Promise<unknown> {
    throw new Error("rewriteContent: not implemented (Phase 2)")
  }
}

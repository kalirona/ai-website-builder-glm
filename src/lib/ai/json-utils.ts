/**
 * Shared JSON-parsing helpers for AI providers.
 *
 * Extracted from `./zai-provider` (Phase 1) so both website generation and
 * section editing use the same robust parsing. The original Phase-1
 * behavior is preserved exactly — only the location changed.
 */

/**
 * Strip leading/trailing markdown code fences.
 * Handles ```json ... ``` and ``` ... ``` forms.
 */
export function stripCodeFences(text: string): string {
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
export function parseJsonLoose(text: string): unknown {
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

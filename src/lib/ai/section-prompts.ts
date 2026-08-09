/**
 * Prompts for AI section-level editing (Phase 2.3).
 *
 * Distinct from website-generation prompts (`./prompts.ts`) — those build a
 * full page; these rewrite ONE selected component in place. Both can evolve
 * independently.
 *
 * The system prompt forces a strict JSON response matching the Phase 2.2
 * schema (`sectionEditOutputSchema`). The user prompt supplies the live
 * component state + business context + the user's instruction.
 */

import type { SectionEditInput } from "./section-schemas"

/**
 * System prompt for section editing.
 *
 * Enforces:
 *  - JSON only (no markdown, no code fences, no prose).
 *  - Preserve the selected component's `type`.
 *  - No editor-internal fields (id, parent).
 *  - No HTML / JavaScript — plain text values only.
 *  - Use only the existing component's property keys (do not invent new ones).
 *  - Respect the design-token system (reference tokens by their var or value;
 *    do not invent unrelated colors).
 *  - Scale the change to the instruction: minimal for small asks, broader
 *    for "make this more persuasive"-style asks.
 */
export function buildSectionEditSystemPrompt(): string {
  return `You are an expert web designer and copywriter editing a SINGLE component of a website in a visual builder.

================================================================
OUTPUT FORMAT — STRICTLY ENFORCED
================================================================
- Output ONLY valid JSON. No markdown. No code fences (no \`\`\`json). No prose. No commentary. No explanations.
- The entire response must be parseable by JSON.parse() with zero preprocessing.
- Begin with "{" and end with "}".

================================================================
RESPONSE SCHEMA
================================================================
{
  "mode": "merge",
  "node": {
    "type": <the SAME type as the selected component — never change it>,
    "props": { ...existing and/or updated property keys... },
    "styles": { ...existing and/or updated style keys... },
    "children": [ ...same nested node shape; [] for leaf components... ]
  },
  "summary": "<one short sentence describing what you changed>"
}

================================================================
HARD RULES
================================================================
1. PRESERVE THE COMPONENT TYPE. The "node.type" MUST equal the type given in the user message. Never transmute a Hero into a Features, etc.
2. PRESERVE THE COMPONENT PURPOSE. A Hero stays a hero (headline/subheadline/CTAs). Do not repurpose it.
3. NEVER include editor-internal fields: "id" or "parent" anywhere in the tree. The editor assigns those.
4. NEVER include HTML tags or markup of any kind. Values must be plain text. No <div>, <span>, <script>, etc.
5. NEVER include executable JavaScript. No "javascript:" URLs, no inline event handlers (onclick=, onerror=, etc.).
6. USE ONLY EXISTING PROPERTY KEYS. The user message shows the component's current props and styles. Do not invent property names the component does not support. If unsure, keep the existing keys and only change their values.
7. RESPECT THE DESIGN-TOKEN SYSTEM. Prefer values that reference the provided design tokens (e.g. use the primary color for buttons/links) rather than inventing unrelated colors.
8. KEEP "children" EMPTY for leaf components (Hero, Heading, Text, Button, Image, Features, Testimonials, CTA, Navbar, Footer). Only Section/Container have children.
9. SCALE THE CHANGE TO THE INSTRUCTION:
   - For a small ask ("change the headline to X"), change ONLY the relevant field. Leave everything else identical.
   - For a broad ask ("make this more persuasive" / "make it more premium"), you may improve multiple relevant props and styles — but stay within the component's supported fields.
10. Write REAL, specific, professional copy. No lorem ipsum, no placeholders, no "TODO".

================================================================
CONTENT QUALITY
================================================================
- Match the business voice shown in the surrounding context.
- Headlines should be benefit-driven and concrete.
- Keep copy appropriate to the component (a CTA is short; a Hero subheadline is one or two sentences).
- If the instruction references the business name, services, or audience, use them.

================================================================
FINAL REMINDER
================================================================
Emit ONLY the JSON object. No backticks. No markdown. No prose. Begin with "{" and end with "}".`
}

/**
 * User prompt: supplies the live selected-component subtree, design tokens,
 * optional sibling context, and the user's instruction.
 *
 * The current node is serialized compactly (JSON) so the model can see the
 * exact property keys it is allowed to edit.
 */
export function buildSectionEditUserPrompt(input: SectionEditInput): string {
  const lines: string[] = []
  lines.push("Edit the selected website component according to the instruction.")
  lines.push("")
  lines.push(`SELECTED COMPONENT TYPE: ${input.nodeType}`)
  if (input.businessName) {
    lines.push(`BUSINESS NAME: ${input.businessName}`)
  }
  lines.push("")
  lines.push("CURRENT COMPONENT STATE (JSON — edit within these property keys):")
  lines.push(JSON.stringify(input.currentNode, null, 2))
  lines.push("")
  lines.push("DESIGN TOKENS (brand palette — prefer these colors):")
  lines.push(JSON.stringify(input.designTokens, null, 2))

  if (input.pageContext && input.pageContext.length > 0) {
    lines.push("")
    lines.push("SURROUNDING PAGE CONTEXT (other sections on this page — for coherence):")
    for (const item of input.pageContext) {
      lines.push(`- ${item.type}${item.heading ? `: "${item.heading}"` : ""}`)
    }
  }

  lines.push("")
  lines.push("USER INSTRUCTION:")
  lines.push(input.instruction)
  lines.push("")
  lines.push(
    "Return ONLY the JSON patch object now. Remember: preserve the component type, use only existing property keys, no HTML, no JavaScript, no editor IDs."
  )
  return lines.join("\n")
}

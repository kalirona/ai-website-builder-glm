# Task 10 — AI Service Abstraction

**Agent:** full-stack-developer (ai-service)
**Task:** Build AI provider interface, zod validation schemas, prompt builders, and the ZAI (z-ai-web-dev-sdk) implementation. Powers the "Generate Website" feature.

## Files created (4)

### 1. `src/lib/ai/schemas.ts`
Zod v4 schemas validating AI output:
- `GenerateWebsiteInput` interface (businessName, businessType, targetAudience?, services?, location?, stylePreference?, primaryGoal?)
- `designTokensSchema` — 8 required strings + optional fonts
- `navItemSchema` — `{ label, url }`
- `nodeSchema` — recursive `z.lazy(() => z.object({...}).passthrough())` typed as `z.ZodType<AiTreeNode>`
- `generatedPageSchema` — `{ name, slug, title?, description?, nodes }`
- `generateWebsiteOutputSchema` — top-level `{ websiteName, domain?, designTokens, navigation, pages }`
- Inferred types exported

### 2. `src/lib/ai/provider.ts`
Interface + types + tree-flattening:
- `AiTreeNode` interface — `{ type, props, styles?, children }` (nested tree shape)
- `AIProvider` interface — `generateWebsite(input)` + phase-2 stubs
- `GenerateWebsiteResult` / `GeneratedPageResult` types
- `flattenTree(tree): EditorData` — walks nested tree, assigns `"root"` to page root, `genId(type.toLowerCase())` to others, builds flat `Record<id, Node>` with `{ id, type, props, styles, children: [childIds], parent }`

### 3. `src/lib/ai/prompts.ts`
- `buildGenerateWebsiteSystemPrompt()` — comprehensive prompt: output-format rules, JSON structure, design-tokens schema, recursive node shape, full 12-component catalog with exact prop shapes + valid icon names, Home page structure (Navbar → Section>Container>Hero → ... → Footer), content-quality rules, URL conventions
- `buildGenerateWebsiteUserPrompt(input)` — fills in business details (optional fields included only when non-empty)

### 4. `src/lib/ai/zai-provider.ts`
Server-only module. `ZAIProvider` class:
1. Builds prompts
2. `ZAI.create()` → `zai.chat.completions.create({ messages: [{role:"assistant",...system}, {role:"user",...user}], thinking:{type:"disabled"} })`
3. Extracts `choices[0].message.content`
4. `stripCodeFences()` — removes leading/trailing ```json fences
5. `parseJsonLoose()` — `JSON.parse` first; on failure extracts first-`{`-to-last-`}` and retries
6. `generateWebsiteOutputSchema.safeParse()` — throws Error with all zod issues + first 500 chars of response on failure
7. Maps to `GenerateWebsiteResult` — defaults headingFont/bodyFont, calls `flattenTree()` per page

Exports `aiProvider` singleton.

## Key decisions

- **`AiTreeNode` defined in provider.ts** (per spec); imported as type-only into schemas.ts → no runtime circular dep (type-only imports are erased at compile time).
- **`.passthrough()` on nodeSchema** — keeps unknown props (forward-compat for slightly-off AI output) while enforcing required `type/props/styles/children` structure. Used despite being deprecated in zod v4 (still functional); the eslint config doesn't flag deprecation.
- **Nested tree → flat map separation** — AI thinks in intuitive parent→child composition; `flattenTree` converts to the flat id-based EditorData the editor store consumes (O(1) lookup, simple move/dup ops).
- **System prompt as `role:"assistant"`** — per documented z-ai-web-dev-sdk API (not "system").
- **Two-stage JSON extraction** — handles models that prepend/append prose despite instructions.
- **Detailed validation errors** — zod issues + first 500 chars of response for debugging.
- **No "use server" directive** (per spec); `// server-only module` comment marker. Imported only by API route handlers.
- **Font defaults** — `var(--font-geist-sans)` when AI omits headingFont/bodyFont (matches `defaultDesignTokens`).

## Verification

- `bunx tsc --noEmit 2>&1 | grep -E "src/lib/ai"` → **no output (0 errors)**
- Full tsc: only pre-existing errors in `examples/` and `skills/` (out of scope)
- `bun run lint` → **0 errors, 0 warnings, exit 0**

## Wiring notes for orchestrator

The `/api/projects/[id]/generate` route should:
1. `import { aiProvider } from "@/lib/ai/zai-provider"`
2. `const result = await aiProvider.generateWebsite(input)`
3. Persist:
   - `result.designTokens` → `Website.globalStyles`
   - `result.navigation` → `Website.navigation`
   - `result.websiteName` → `Website.name`
   - `result.domain` → `Website.domain`
   - For each `page` in `result.pages`:
     - `page.editorData` (already flat, id-based) → `Page.editorData`
     - `page.name/slug/title/description` → corresponding Page fields

The first page (Home) can be loaded directly into the editor store via `useEditorStore.getState().load(projectId, slug, editorData, designTokens)`.

## Sample expected AI output shape

```json
{
  "websiteName": "Acme Bakery",
  "designTokens": { "primary":"#c2410c", "secondary":"#92400e", "accent":"#f59e0b", "background":"#fffbeb", "foreground":"#1c1917", "muted":"#fef3c7", "border":"#fde68a", "radius":"12px" },
  "navigation": [ {"label":"Home","url":"#"}, {"label":"Menu","url":"#menu"}, {"label":"About","url":"#about"}, {"label":"Contact","url":"#contact"} ],
  "pages": [{
    "name":"Home","slug":"home",
    "nodes": { "type":"Section","props":{},"children":[
      {"type":"Navbar","props":{"brand":"Acme Bakery","logo":"","links":[...],"ctaText":"Order Now","ctaUrl":"#contact","sticky":true},"children":[]},
      {"type":"Section","props":{},"children":[{"type":"Container","props":{},"children":[
        {"type":"Hero","props":{"eyebrow":"Welcome to Acme","headline":"Fresh Bread, Baked Daily","subheadline":"...","primaryButton":{"text":"Order Now","url":"#contact"},"secondaryButton":{"text":"View Menu","url":"#menu"},"image":"","imagePosition":"none","align":"center"},"children":[]}
      ]}]},
      {"type":"Section","props":{},"children":[{"type":"Container","props":{},"children":[
        {"type":"Features","props":{"eyebrow":"Why Acme","heading":"What Makes Us Different","subheading":"...","columns":3,"items":[{"icon":"sparkles","title":"...","description":"..."},...]},"children":[]}
      ]}]},
      {"type":"Section","props":{},"children":[{"type":"Container","props":{},"children":[
        {"type":"Testimonials","props":{"eyebrow":"Reviews","heading":"Loved by Locals","subheading":"...","columns":3,"items":[{"quote":"...","author":"...","role":"...","avatar":""},...]},"children":[]}
      ]}]},
      {"type":"Section","props":{},"children":[{"type":"Container","props":{},"children":[
        {"type":"CTA","props":{"heading":"Ready to Taste the Difference?","subheading":"...","buttonText":"Order Now","buttonUrl":"#contact"},"children":[]}
      ]}]},
      {"type":"Footer","props":{"brand":"Acme Bakery","description":"...","columns":[{"title":"Company","linksText":"About|#\nCareers|#\nPress|#"},...],"copyright":"© 2024 Acme Bakery. All rights reserved."},"children":[]}
    ]}
  }]
}
```

After `flattenTree()`, `page.editorData` becomes:
```ts
{
  rootId: "root",
  nodes: {
    root: { id:"root", type:"Section", props:{}, styles:{}, children:["navbar_xxx","section_yyy",...,"footer_zzz"], parent:null },
    "navbar_xxx": { id:"navbar_xxx", type:"Navbar", props:{...}, styles:{}, children:[], parent:"root" },
    "section_yyy": { id:"section_yyy", type:"Section", props:{}, styles:{}, children:["container_aaa"], parent:"root" },
    "container_aaa": { id:"container_aaa", type:"Container", props:{}, styles:{}, children:["hero_bbb"], parent:"section_yyy" },
    "hero_bbb": { id:"hero_bbb", type:"Hero", props:{...}, styles:{}, children:[], parent:"container_aaa" },
    ...
  }
}
```

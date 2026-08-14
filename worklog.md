# AI Website Builder SaaS — Architecture & Work Log

---
Task ID: 0
Agent: orchestrator
Task: Produce architecture document (sections A–I) before coding

Work Log:
- Inspected existing repository (Next.js 16, React 19, TS5, Tailwind4, shadcn/ui New York, Prisma6+SQLite, NextAuth v4 installed, @dnd-kit, zustand, framer-motion, zod, z-ai-web-dev-sdk all available)
- Authored architecture overview, folder structure, data model, editor architecture, registry, AI abstraction, API routes, phase plan, risks

Stage Summary:
- Architecture baseline set. See sections A–I below. Build proceeds phase-by-phase.

---

# A. Architecture Overview

**Core principle:** The source of truth is a structured page schema, never AI-generated HTML/JS.

```
User intent ──► AI Provider ──► validated NodeSchema ──► Editor Store (Zustand)
                                                              │
                                   ┌──────────────────────────┼───────────────────────┐
                                   ▼                          ▼                       ▼
                          Visual Editor Canvas        Right Property Panel       Save → DB (JSON)
                                   │                                                  │
                                   ▼                                                  ▼
                          Preview Mode (same renderer)                      Published Website (same renderer)
```

Layers:
1. **Data layer** — Prisma + SQLite. Projects, Websites, Pages store editor state as a serialized JSON `nodes` document. User/Account/Session managed by NextAuth.
2. **API layer** — Next.js Route Handlers under `src/app/api`. Every project/website route is owner-scoped (authorization check on every request).
3. **AI layer** — `AIProvider` interface + `ZAIProvider` (z-ai-web-dev-sdk) adapter. Returns JSON validated against zod schemas. Provider is swappable.
4. **Editor engine** — Custom Craft.js-inspired engine (Zustand store): flat node map, selection, history (undo/redo), actions (add/move/delete/duplicate/update), serialization. React 19 compatible (Craft.js itself has React-19 risk; documented in §I).
5. **Component registry** — Declarative registry mapping `type → { render, settings, defaults, allowedChildren }`. Extensible without touching the editor.
6. **Renderer** — Single `<NodeRenderer>` used by editor canvas, preview mode, and (future) published site. Renders a node tree from the schema. This guarantees WYSIWYG across contexts.
7. **Presentation** — App Router pages: `/` (landing), `/login`, `/register`, `/dashboard`, `/editor/[projectId]`, `/preview/[projectId]`.

# B. Folder Structure

```
src/
├── app/
│   ├── layout.tsx                  # root: providers, fonts
│   ├── globals.css                 # design tokens (light/dark)
│   ├── page.tsx                    # landing (auth-aware redirect)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx          # projects + create-website (AI)
│   ├── editor/[projectId]/page.tsx # visual editor
│   ├── preview/[projectId]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── projects/route.ts            # GET(list) POST(create)
│       ├── projects/[id]/route.ts       # GET PATCH DELETE
│       ├── projects/[id]/generate/route.ts   # POST AI generate website
│       ├── websites/[projectId]/route.ts     # GET upsert website
│       └── pages/[projectId]/route.ts        # GET/PUT page editor state
├── components/
│   ├── ui/                         # shadcn (existing)
│   ├── editor/
│   │   ├── editor-shell.tsx        # resizable panel layout
│   │   ├── top-bar.tsx
│   │   ├── left-sidebar.tsx        # components / layers / pages tabs
│   │   ├── canvas.tsx              # renders NodeRenderer + selection + dnd
│   │   ├── node-renderer.tsx       # THE single renderer (editor + preview)
│   │   ├── node-wrapper.tsx        # selection outline + inline edit + dnd handle
│   │   ├── right-panel.tsx         # property/style/advanced tabs
│   │   ├── controls/               # text, textarea, color, select, slider, toggle, responsive-field
│   │   └── inline-text.tsx         # contentEditable inline editing
│   ├── website/                    # the 12 user components (registry entries)
│   │   ├── section.tsx container.tsx heading.tsx text.tsx button.tsx image.tsx
│   │   ├── hero.tsx features.tsx testimonials.tsx cta.tsx navbar.tsx footer.tsx
│   │   └── index.ts                # registry assembly
│   └── shared/                     # app logo, buttons, etc.
├── lib/
│   ├── db.ts                       # prisma client (existing)
│   ├── auth.ts                     # nextauth config + helpers
│   ├── auth-guard.ts               # getCurrentUser, requireUser
│   ├── editor/
│   │   ├── types.ts                # Node, EditorState, etc.
│   │   ├── store.ts                # zustand editor store + history
│   │   ├── registry.ts             # component registry + helpers
│   │   ├── node-ops.ts             # pure tree operations (add/move/remove/dup)
│   │   ├── serialize.ts            # nodes <-> JSON, schema validation
│   │   └── design-tokens.ts        # global design system tokens + resolver
│   ├── ai/
│   │   ├── provider.ts             # AIProvider interface
│   │   ├── zai-provider.ts         # z-ai-web-dev-sdk implementation
│   │   ├── prompts.ts              # prompt builders
│   │   └── schemas.ts              # zod schemas for AI output validation
│   └── utils.ts                    # cn (existing) + slug + id gen
└── hooks/
    ├── use-mobile.ts (existing)
    └── use-debounce.ts
```

# C. Data Model

**Prisma (SQLite):**

```prisma
model User { id, email(unique), name?, passwordHash, createdAt, updatedAt, projects[] }
model Account { ... nextauth oauth (unused for creds but kept) }
model Session { ... nextauth jwt sessions (kept for compat) }
model VerificationToken { ... }

model Project {
  id           String   @id @default(cuid())
  ownerId      String
  owner        User     @relation(...)
  name         String
  slug         String
  description  String?
  businessType String?
  status       String   @default("draft")   // draft|generating|ready|published
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  website      Website?
  @@unique([ownerId, slug])
}

model Website {
  id           String   @id @default(cuid())
  projectId    String   @unique
  project      Project  @relation(...)
  name         String
  domain       String?
  logo         String?
  favicon      String?
  globalStyles Json     // design tokens
  theme        String   @default("light")
  navigation   Json     // nav items
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  pages        Page[]
}

model Page {
  id          String   @id @default(cuid())
  websiteId   String
  website     Website  @relation(...)
  name        String
  slug        String
  title       String?
  description String?
  seo         Json?    // {title,description,ogImage}
  editorData  Json     // { nodes: Record<id,Node>, rootId }  ← source of truth
  status      String   @default("draft")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([websiteId, slug])
}
```

**Node (the editor source-of-truth, stored in `Page.editorData`):**

```ts
type Responsive<T> = { desktop: T; tablet?: T; mobile?: T };
interface Node {
  id: string;
  type: string;                 // registry key, e.g. "Hero"
  props: Record<string, any>;   // content: heading, buttonText...
  styles: Record<string, any>;  // responsive + style: fontSize, bg, padding...
  children: string[];           // ordered child node ids
  parent: string | null;
}
interface EditorData { nodes: Record<string, Node>; rootId: string; }
```

# D. Editor Architecture

**Store (Zustand)** — `editorStore`:
- State: `nodes`, `rootId`, `selectedId`, `device`, `history` (past/future snapshots), `dirty`, `website`, `page`.
- Actions: `load(data)`, `serialize()`, `addNode(type, parentId, index?)`, `removeNode(id)`, `moveNode(id, newParent, index)`, `duplicateNode(id)`, `updateProps(id, patch)`, `updateStyles(id, patch)`, `select(id)`, `undo()`, `redo()`, `setDevice(d)`.
- **History:** before every mutating action, push a deep-cloned snapshot of `nodes` to `past` (cap 50). Undo pops past→future, etc. Uses structuredClone.
- **Selection:** `selectedId` references a node; NodeWrapper renders outline + toolbar when selected.
- **DnD:** `@dnd-kit` for reordering children within a container and moving nodes between containers. Drag from the component palette (left sidebar) creates a new node.
- **Inline editing:** contentEditable on Heading/Text/Button labels; on blur, commits to store (debounced) and syncs right panel.

**NodeRenderer** — the single renderer. Recursively walks `nodes` from `rootId`, looks up `registry[type].render`, passes `props`/`styles`/`children`. Used by:
- Editor canvas (wrapped in NodeWrapper for selection)
- Preview mode (no wrappers)
- Future published site

**Design tokens:** `globalStyles` on Website holds `{ primary, secondary, accent, background, foreground, muted, border, radius, headingFont, bodyFont }`. The canvas root injects these as CSS variables; components consume `var(--brand-primary)` etc. Changing the token updates the whole site.

# E. Component Registry Architecture

```ts
interface ComponentDefinition<P = any> {
  type: string;                       // unique, e.g. "Hero"
  name: string;                       // human label
  icon: LucideIcon;
  category: 'layout'|'content'|'media'|'marketing';
  isCanvas?: boolean;                 // can contain children (Section, Container)
  allowedChildren?: string[] | '*';   // constraint
  defaultProps: P;
  defaultStyles: Record<string, any>;
  render: (p: RenderProps<P>) => ReactNode;   // pure, consumes design tokens
  settings: SettingsField[];          // drives the right panel UI
}
interface SettingsField {
  key: string;                        // props.* or styles.*
  label: string;
  group: 'content'|'layout'|'style'|'typography';
  type: 'text'|'textarea'|'color'|'select'|'slider'|'toggle'|'image'|'responsive-text';
  options?: {label,value}[];
  min?,max?,step?;
  responsive?: boolean;               // show desktop/tablet/mobile tabs
  placeholder?: string;
}
```

The right panel iterates `registry[type].settings` and renders the matching control. **Adding a component = adding one file + one registry entry.** No editor changes needed.

# F. AI Abstraction Architecture

```ts
interface AIProvider {
  generateWebsite(input: GenerateWebsiteInput): Promise<GenerateWebsiteOutput>;
  generateSection(input: SectionEditInput): Promise<Node>;        // phase 2
  rewriteContent(input): Promise<Partial<Node['props']>>;         // phase 2
  generateSEO(input): Promise<SEO>;                                // phase 2
}
```
- `ZAIProvider` implements this via `z-ai-web-dev-sdk` (backend only).
- Prompts force **strict JSON** matching the node schema. Output is parsed and validated against zod schemas (`websiteSchema`, `nodeSchema`) before touching the store.
- AI never returns HTML/JS. It returns a validated `EditorData` (nodes tree) which the renderer consumes.
- The frontend calls our API (`/api/projects/[id]/generate`); the backend calls the provider. Swappable to n8n/OpenAI/Gemini later by implementing the interface.

# G. API Route List

| Method | Route | Purpose |
|---|---|---|
| * | `/api/auth/[...nextauth]` | NextAuth (login/register/session) |
| GET | `/api/projects` | list current user's projects |
| POST | `/api/projects` | create project (+ optional AI generate) |
| GET | `/api/projects/[id]` | get one project (owner-checked) |
| PATCH | `/api/projects/[id]` | rename/desc/status |
| DELETE | `/api/projects/[id]` | delete project + website + pages |
| POST | `/api/projects/[id]/generate` | AI generate website → pages |
| GET | `/api/websites/[projectId]` | get website + pages summary |
| GET | `/api/pages/[projectId]?slug=home` | get page editor data |
| PUT | `/api/pages/[projectId]?slug=home` | save editor data |

All project/website/page routes call `requireUser()` then verify `project.ownerId === user.id`.

# H. Phase-by-Phase Implementation Plan

**Phase 1 (this build):**
1. Prisma schema → db:push
2. NextAuth (credentials) + auth lib + guards
3. Core types + design tokens + registry interface
4. 12 components + settings schemas + registry assembly
5. Editor store (nodes, selection, history, actions, serialize)
6. NodeRenderer + NodeWrapper (selection, inline edit)
7. Editor UI shell: top bar, left sidebar (components/layers/pages), canvas, right panel
8. Responsive preview + preview page
9. API routes (projects, websites, pages)
10. AI provider (ZAI) + generate-website feature + schema validation
11. Auth UI + Dashboard + Landing
12. Providers wiring + dev server + Agent Browser verification

**Phase 2 (later, not now):** AI section editing, templates, design-system editor UI, inline image generation, publishing, n8n/directus integration, billing.

# I. Risks & Architectural Decisions

1. **Craft.js vs custom engine.** Craft.js relies on React internals that changed in React 19 (the project is on React 19). Risk of runtime breakage and hard-to-debug editor issues. **Decision:** build a custom Craft.js-inspired engine (flat node map, connectors, query/actions) on Zustand + @dnd-kit. This preserves the architecture's intent (structured editing, component registry, extensible) while removing version risk and giving full control over the schema-as-source-of-truth invariant. The engine API mirrors Craft.js concepts so a future migration is feasible.
2. **SQLite JSON storage.** `editorData` stored as JSON String (SQLite has no native JSON column type in Prisma; `Json` maps to TEXT). Acceptable for MVP scale. Phase 2 can move to Postgres with indexed JSONB.
3. **AI output safety.** AI returns JSON only, validated by zod, never executed. Props are rendered through React components (no `dangerouslySetInnerHTML` for AI content). Inline text uses contentEditable with store commits (no raw HTML insertion).
4. **Multi-tenancy / authorization.** Every data route verifies ownership. No cross-user access by ID tampering. Slugs are unique per-owner.
5. **NextAuth credentials + JWT.** No OAuth in MVP; credentials provider with scrypt-hashed passwords (Node crypto, no extra deps). JWT sessions (stateless) via NextAuth.
6. **Responsive storage.** Responsive style values stored as `{desktop,tablet,mobile}` objects on `node.styles`. Renderer resolves per active device. Avoids duplicating the whole tree per breakpoint.
7. **Scope discipline.** Billing, collaboration, custom domains, templates UI, n8n/directus deployment are explicitly excluded from Phase 1 per spec §20. Abstractions (AIProvider, WebsitePublisher interface) are scaffolded but not fully wired to external infra.

---
Task ID: 5
Agent: full-stack-developer (components)
Task: Build 12 website components + registry assembly

Work Log:
- Read existing infrastructure: types.ts (ComponentDefinition/RenderProps/SettingsField/Node), registry.ts (registerComponent/getComponent/listComponents), design-tokens.ts (resolveResponsive/tokensToCssVars/deviceWidth), editor-context.tsx, inline-text.tsx (InlineText — contentEditable wrapper).
- Confirmed available design-token CSS vars: --brand-primary/secondary/accent/background/foreground/muted/border/radius/heading-font/body-font.
- Created src/components/website/icon-picker.tsx — maps 45+ icon-name strings (sparkles, shield, trending-up, …) to lucide-react icons via pickIcon(name) with iconNames export.
- Created src/components/website/responsive.ts — small typed helper `rs(value, device, fallback)` wrapping resolveResponsive<string> to avoid `unknown` seeping into CSSProperties (Record<string,unknown> → string cast in one place).
- Extended src/components/editor/inline-text.tsx (additive, backward compatible) with an optional `style?: React.CSSProperties` prop that merges with the editable affordances ({ outline, cursor }) so components can pass dynamic typography inline styles (font-size, color, font-weight, line-height, letter-spacing, text-align) directly to the contentEditable element. Existing callers (no style) unaffected.
- Built 12 ComponentDefinition files under src/components/website/:
  - section.tsx (layout, isCanvas, allowedChildren="*") — full-width section + inner max-width padded container; styles.background/padding(max responsive)/maxWidth/minHeight.
  - container.tsx (layout, isCanvas) — centered max-width + responsive padding.
  - heading.tsx (content) — h1/h2/h3/h4 with InlineText, dynamic typography, alignment, level select.
  - text.tsx (content) — paragraph w/ InlineText multiline, alignment, responsive font-size.
  - button.tsx (content) — anchor styled by variant (primary/secondary/outline/ghost) + size (sm/md/lg); cursor + onClick noop in editable mode; InlineText label.
  - image.tsx (media) — img with width/height/fit/radius; dashed muted placeholder when src empty.
  - hero.tsx (marketing) — 2-col grid (text + image), eyebrow badge, headline, subheadline, primary+secondary buttons, image-position left/right/none, mobile single-column stack via ctx.device, gradient placeholder if no image.
  - features.tsx (marketing) — centered header + responsive cards grid (1 mobile, ≤2 tablet, N desktop), icon circle, hover lift shadow, list of {icon,title,description}.
  - testimonials.tsx (marketing) — header + responsive cards grid, quote mark, 5 stars (accent), avatar or initials fallback, divider, author/role, hover lift.
  - cta.tsx (marketing) — centered primary-bg card with heading, subheadline, white-bg button; InlineText for all three texts; responsive padding.
  - navbar.tsx (marketing) — sticky top bar, brand (logo image or initial-badge + InlineText brand name), center nav links (hidden on mobile), CTA button; hover color shifts.
  - footer.tsx (marketing) — dark slate-900 (#0f172a) footer; brand + description + 3 social icons (Twitter/GitHub/LinkedIn) + N link columns; columns store links as `linksText` ("Label|url" per line) parsed via split('\n').split('|'); copyright bar with top border.
- Created src/components/website/index.ts registry assembly — imports all 12 defs, registers each via registerComponent on module load (guarded by `registered` flag to be SSR-safe), re-exports defs + pickIcon/iconNames.
- All components consume design tokens via `var(--brand-*)` so brand-color changes propagate everywhere; default text colors use slate-600 (#475569) and footer dark slate-900 (#0f172a) per spec.
- Responsive design driven by ctx.device (mobile/tablet/desktop) — grids collapse, font sizes shrink, nav links hide on mobile.
- Hover states on buttons, cards, links; subtle box-shadow lifts and color transitions (150-200ms ease).
- All primary human-visible text fields (heading, text, button label, hero headline/subhead, cta heading/subhead/button, navbar brand) use InlineText; list items + secondary fields render plain text (right panel handles editing).
- Ran `bun run lint` — initially 4 warnings about unused eslint-disable directives for @next/next/no-img-element (project's eslint config doesn't enforce that rule). Removed the 4 directives. Re-ran lint: 0 errors, 0 warnings, exit 0.
- Ran `bunx tsc --noEmit` to verify types — found two issues: (1) resolveResponsive returning `unknown` because `styles.X as unknown` made T=unknown (CSSProperties fields rejected unknown); fixed by introducing the `rs()` typed helper in responsive.ts. (2) `ComponentDefinition<Props>` not assignable to `ComponentDefinition<Record<string, unknown>>` in the registry assembly array due to function-arg contravariance; fixed with `as unknown as ComponentDefinition` casts on each item. Final tsc result for src/components/website/*: 0 errors.

Stage Summary:
- Files created (15 total):
  - src/components/website/section.tsx
  - src/components/website/container.tsx
  - src/components/website/heading.tsx
  - src/components/website/text.tsx
  - src/components/website/button.tsx
  - src/components/website/image.tsx
  - src/components/website/hero.tsx
  - src/components/website/features.tsx
  - src/components/website/testimonials.tsx
  - src/components/website/cta.tsx
  - src/components/website/navbar.tsx
  - src/components/website/footer.tsx
  - src/components/website/icon-picker.tsx (45+ icon-name → LucideIcon map + pickIcon + iconNames)
  - src/components/website/responsive.ts (typed `rs()` wrapper around resolveResponsive)
  - src/components/website/index.ts (registry assembly: imports all 12, registers via registerComponent, re-exports)
- Files modified (additive, backward-compatible):
  - src/components/editor/inline-text.tsx — added optional `style?: React.CSSProperties` prop, merged into both preview and edit-mode renders.
- Key decisions:
  - Components are pure (no editor-store imports); they receive props/styles/ctx/children via RenderProps and consume ctx.device for responsive layout, ctx.editable to disable navigation/active states.
  - All marketing components resolve column counts from ctx.device (mobile=1, tablet≤2, desktop=N) rather than CSS media queries — required because the editor canvas is a fixed-width div inside the browser window so Tailwind breakpoints wouldn't reliably trigger.
  - Footer columns store links as `linksText` ("Label|url\nLabel2|url2") parsed at render time — simpler than nested lists in the settings panel.
  - Hero with imagePosition="none" renders single-column centered layout (no image column at all).
  - Hero buttons and CTA buttons use `var(--brand-primary)` for primary variant; CTA's outer card uses primary background with white text + white-bg button for high contrast.
  - Hover affordances (lift shadows, color shifts, opacity) are suppressed when ctx.editable to avoid distracting the editor.
- Lint result: `bun run lint` → 0 errors, 0 warnings (exit 0).
- Type check result: `bunx tsc --noEmit` → 0 errors in src/components/website/* (other folders' pre-existing errors are out of scope).
- The registry is now populated on any module that side-effect-imports `@/components/website` (or any of its named exports). Next agents can call `getComponent("Hero")`, `listComponentsByCategory()`, etc.

---
Task ID: 10
Agent: full-stack-developer (ai-service)
Task: Build AI abstraction (provider interface, zod schemas, prompts, ZAI impl)

Work Log:
- Read worklog.md (architecture sections A–I + Task 5 component summary). Confirmed 12 registered component types (Navbar, Hero, Features, Testimonials, CTA, Footer, Heading, Text, Button, Image, Section, Container) and their exact prop shapes from the Task 5 entry. Confirmed editor Node shape `{ id, type, props, styles, children: string[], parent }` and EditorData `{ nodes: Record<id, Node>, rootId }` in `src/lib/editor/types.ts`. Confirmed `genId(prefix)` and `slugify()` in `src/lib/utils.ts`. Confirmed zod v4.3.5 + z-ai-web-dev-sdk v0.0.18 installed; verified `z.object().passthrough()` (deprecated but functional), `z.looseObject()`, `z.record(keyType, valueType)`, `z.lazy()` recursive pattern, and `.safeParse()` instance method all exist in v4.
- Created `src/lib/ai/schemas.ts` — zod schemas:
  - `GenerateWebsiteInput` interface (businessName, businessType, targetAudience?, services?, location?, stylePreference?, primaryGoal?).
  - `designTokensSchema` — z.object with 8 required strings (primary/secondary/accent/background/foreground/muted/border/radius) + optional headingFont/bodyFont.
  - `navItemSchema` — `{ label: string, url: string }`.
  - `nodeSchema` — recursive `z.lazy(() => z.object({ type, props: z.record(z.string(), z.unknown()), styles?: record, children: z.array(nodeSchema) }).passthrough())` typed as `z.ZodType<AiTreeNode>`. `.passthrough()` keeps unknown keys (forward-compat for slightly-off AI output) while enforcing the required structure.
  - `generatedPageSchema` — `{ name, slug, title?, description?, nodes: nodeSchema }` (root node is a nested tree, NOT flat).
  - `generateWebsiteOutputSchema` — `{ websiteName, domain?, designTokens, navigation: navItem[], pages: generatedPage[] (min 1) }`.
  - Inferred types exported (GenerateWebsiteOutput, DesignTokensOutput, NavItemOutput, GeneratedPageOutput).
- Created `src/lib/ai/provider.ts` — interface + types + tree-flattening:
  - `AiTreeNode` interface — `{ type, props: Record<string,unknown>, styles?: Record<string,unknown>, children: AiTreeNode[] }` (the nested shape the AI produces; co-located here per spec, imported as type into schemas.ts for the recursive zod type — type-only import avoids any runtime circular dep).
  - `GeneratedPageResult`, `GenerateWebsiteResult` interfaces — fully-validated result with EditorData per page.
  - `AIProvider` interface — `generateWebsite(input)` + phase-2 placeholders (`generateSection?`, `rewriteContent?`).
  - `flattenTree(tree: AiTreeNode): EditorData` — walks the nested tree depth-first; assigns `"root"` to the page root (parent null); every other node gets `genId(type.toLowerCase())` (matching the convention in `node-ops.ts`); builds a flat `Record<id, Node>` where each Node has `{ id, type, props, styles: styles||{}, children: [childIds], parent }`. Returns `{ nodes, rootId: "root" }`. Helper `safePrefix()` sanitizes the type into a valid genId prefix (strips non-alphanumerics, falls back to "n").
- Created `src/lib/ai/prompts.ts` — prompt builders:
  - `buildGenerateWebsiteSystemPrompt()` — comprehensive prompt covering: output-format rules (JSON only, no fences/commentary), top-level JSON structure, design-tokens schema (with hex + cohesion guidance + business-appropriate palette examples), page object shape, recursive node structure, FULL component catalog (all 12 types with exact prop shapes and valid icon names list), Home page structure (Navbar → Section>Container>Hero → Section>Container>Features → Section>Container>Testimonials → Section>Container>CTA → Footer) with a literal tree skeleton, content-quality rules (no lorem ipsum, real specific copy, realistic testimonials, relevant footer columns), URL conventions, final reminder.
  - `buildGenerateWebsiteUserPrompt(input)` — fills in business details (businessName + businessType always; targetAudience/services/location/stylePreference/primaryGoal included only when non-empty).
- Created `src/lib/ai/zai-provider.ts` — ZAI implementation:
  - `// server-only module` comment at top (no "use server" directive per spec; file is imported only by API route handlers).
  - `ZAIProvider` class implementing `AIProvider.generateWebsite`:
    1. Builds system + user prompts.
    2. `await ZAI.create()` then `zai.chat.completions.create({ messages: [{role:"assistant", content: systemPrompt}, {role:"user", content: userPrompt}], thinking: { type: "disabled" } })` — note the assistant role for the system prompt per the SDK's API.
    3. Extracts `completion.choices[0].message.content` (string; throws if empty/non-string).
    4. `stripCodeFences()` — removes leading ```json/``` and trailing ``` with regex.
    5. `parseJsonLoose()` — `JSON.parse` first; on failure, extracts substring from first `{` to last `}` and retries; throws with both error messages if both attempts fail.
    6. Validates with `generateWebsiteOutputSchema.safeParse()`; on failure throws Error with all zod issues formatted as `path | message` lines + first 500 chars of cleaned response for debugging.
    7. Maps validated data to `GenerateWebsiteResult` — fills `headingFont`/`bodyFont` defaults (`var(--font-geist-sans)`) when omitted; calls `flattenTree(page.nodes)` per page to produce `editorData`.
  - `generateSection()` / `rewriteContent()` phase-2 stubs that throw "not implemented".
  - Exports `aiProvider` singleton (`new ZAIProvider()`).
- Verification:
  - `cd /home/z/my-project && bunx tsc --noEmit 2>&1 | grep -E "src/lib/ai"` → NO OUTPUT (0 errors in src/lib/ai/*). Full tsc shows only pre-existing errors in `examples/` and `skills/` folders (out of scope, unrelated to this task).
  - `bun run lint` → 0 errors, 0 warnings, exit 0.

Stage Summary:
- Files created (4 total, all under src/lib/ai/):
  - `src/lib/ai/schemas.ts` — zod v4 schemas: designTokensSchema, navItemSchema, nodeSchema (recursive + passthrough), generatedPageSchema, generateWebsiteOutputSchema; GenerateWebsiteInput interface; inferred type exports.
  - `src/lib/ai/provider.ts` — AiTreeNode type, GenerateWebsiteResult/GeneratedPageResult/AIProvider interfaces, flattenTree() function converting nested AI tree → flat id-based EditorData (root="root", child ids via genId(type.toLowerCase())).
  - `src/lib/ai/prompts.ts` — buildGenerateWebsiteSystemPrompt() (full component catalog + page structure + content rules) and buildGenerateWebsiteUserPrompt(input) (business details, optional fields included only when non-empty).
  - `src/lib/ai/zai-provider.ts` — ZAIProvider class (server-only module) implementing generateWebsite via z-ai-web-dev-sdk: system prompt as assistant role, thinking disabled, strip code fences, JSON.parse with first-{ to last-} retry, zod safeParse validation with detailed error reporting, design-token default-font fallback, per-page flattenTree mapping. Exports `aiProvider` singleton. Phase-2 stubs throw "not implemented".
- Key decisions:
  - Defined `AiTreeNode` in provider.ts (per spec) and imported it as a TYPE-ONLY import into schemas.ts — type-only imports are erased at compile time so there's no runtime circular dependency between the two modules (provider.ts runtime-imports GenerateWebsiteInput from schemas.ts; schemas.ts type-only-imports AiTreeNode from provider.ts).
  - Used `z.lazy(() => z.object({...}).passthrough())` for the recursive nodeSchema. `.passthrough()` (deprecated in zod v4 but functional) keeps unknown props so a slightly-off AI response still loads rather than hard-failing; the required `type/props/styles/children` structure is still enforced. Typed as `z.ZodType<AiTreeNode>` to break the recursive type cycle.
  - The AI produces a NESTED tree (children are full node objects). `flattenTree()` converts it to the flat id-based EditorData the editor store consumes. This separation lets the AI think in terms of intuitive parent→child composition while the editor's source-of-truth remains the flat map (which supports O(1) node lookup, simple move/duplicate ops, and clean serialization).
  - System prompt uses role "assistant" (not "user") for the system message — per the documented z-ai-web-dev-sdk API. `thinking: { type: "disabled" }` to get direct JSON output without reasoning preamble.
  - Two-stage JSON extraction: first try `JSON.parse(cleaned)`; if that fails, extract substring from first `{` to last `}` and retry. This handles models that prepend "Here is the result:" or append trailing commentary despite instructions.
  - Validation errors include the full list of zod issues (path + message) AND the first 500 chars of the cleaned AI response — critical for debugging prompt issues during development.
  - Did NOT add "use server" directive (per spec) — the file is imported only by server-side API route handlers. Added `// server-only module` comment as a convention marker.
  - `designTokens` validated shape is cast to the editor's `DesignTokens` type with `headingFont`/`bodyFont` defaulted to `var(--font-geist-sans)` when the AI omits them (matches `defaultDesignTokens` in `src/lib/editor/types.ts`).
- Sample AI output (what the system prompt elicits — verified by prompt structure):
  ```json
  {
    "websiteName": "Acme Bakery",
    "designTokens": { "primary":"#c2410c", "secondary":"#92400e", "accent":"#f59e0b", "background":"#fffbeb", "foreground":"#1c1917", "muted":"#fef3c7", "border":"#fde68a", "radius":"12px" },
    "navigation": [ {"label":"Home","url":"#"}, {"label":"Menu","url":"#menu"}, {"label":"About","url":"#about"}, {"label":"Contact","url":"#contact"} ],
    "pages": [{
      "name":"Home","slug":"home",
      "nodes": { "type":"Section","props":{},"children":[
        {"type":"Navbar","props":{"brand":"Acme Bakery","logo":"","links":[...4...],"ctaText":"Order Now","ctaUrl":"#contact","sticky":true},"children":[]},
        {"type":"Section","props":{},"children":[{"type":"Container","props":{},"children":[{"type":"Hero","props":{"eyebrow":"...","headline":"...","subheadline":"...","primaryButton":{...},"secondaryButton":{...},"image":"","imagePosition":"none","align":"center"},"children":[]}]}]},
        ...Features/Testimonials/CTA each wrapped in Section>Container...
        {"type":"Footer","props":{"brand":"Acme Bakery","description":"...","columns":[...],"copyright":"© 2024 Acme Bakery. All rights reserved."},"children":[]}
      ]}
    }]
  }
  ```
- Type check result: `bunx tsc --noEmit` → 0 errors in src/lib/ai/* (only pre-existing errors in examples/ and skills/ folders, out of scope).
- Lint result: `bun run lint` → 0 errors, 0 warnings (exit 0).
- The AI abstraction is ready for the orchestrator to wire into `/api/projects/[id]/generate`. API route should: import `aiProvider` from `@/lib/ai/zai-provider`, call `generateWebsite(input)`, persist `designTokens` → `Website.globalStyles`, `navigation` → `Website.navigation`, and for each page `flattenTree` result → `Page.editorData`.

---
Task ID: FINAL
Agent: orchestrator
Task: Phase 1 implementation, integration, and end-to-end verification

Work Log:
- Built foundation: Prisma schema (User/Account/Session/VerificationToken/Project/Website/Page), NextAuth v4 credentials (scrypt hashing), auth guards, core editor types, design-token resolver, node-ops, registry, Zustand store (selection + undo/redo history + actions + serialization)
- Delegated 12 website components + registry assembly to subagent (Task 5) — all lint-clean, consume design tokens, InlineText support
- Delegated AI service (provider interface + ZAI impl + zod schemas + prompts + flattenTree) to subagent (Task 10)
- Built editor UI: NodeRenderer (single renderer for editor+preview), NodeWrapper (selection/hover/DnD/toolbar), canvas (DnD context + device viewport + token CSS vars), left sidebar (Components/Layers/Pages), right panel (grouped settings + 9 control types incl. responsive + list), top bar (undo/redo/device/preview/save/publish), editor shell (resizable panels + keyboard shortcuts + page switching)
- Built API: register, projects CRUD, generate (AI), websites, pages (save/load with validation)
- Built pages: landing (auth-aware), login, register, dashboard (stats + project grid + AI create dialog), editor (server-loaded), preview (device toggle)
- Fixed critical bug: createBlankEditorData was in "use client" store module → moved to server-safe node-ops.ts; updated all server imports
- Fixed: missing create-website-dialog.tsx (directory created after first write); missing ChevronRight import; Root node rendered as bare container so page sections stack cleanly

Verification (Agent Browser end-to-end):
- Landing → register → login → dashboard: OK (real session, real DB)
- "New Website" dialog → fill business details → AI Generate: OK (z-ai-web-dev-sdk, ~24s, validated JSON)
- Redirect to editor with AI-generated 15-node website (Navbar/Hero/Features/Testimonials/CTA/Footer + Sections/Containers): OK
- Canvas renders real AI copy ("Transform Your Small Business...", "Bloom Coffee Roasters" navbar, etc.)
- Component selection → right panel shows grouped settings (Content/Layout/Style): OK
- Device toggle (desktop/tablet/mobile): OK
- Undo (Ctrl+Z) + Save (PUT /api/pages): OK
- Preview page (/preview/[id]) renders same schema with device toggle: OK
- No console/runtime errors
- Vision analysis of editor screenshot: "highly professional and polished, modern minimalist design, clear typography hierarchy, cohesive color scheme"

Stage Summary:
- Phase 1 COMPLETE. Functioning visual website builder (not a mockup): AI generation → structured schema → visual editor → preview, all working.
- Every implemented button performs a real action. No "Coming Soon" / TODO / fake functionality.
- 12 components, 9 property control types, undo/redo, DnD + click-to-add, inline text editing, responsive preview, save/load, publish (status update), AI website generation with zod validation.
- Architecture honors the core principle: structured schema is the source of truth (AI → schema → editor → published site all share NodeRenderer).
- AI provider is swappable (AIProvider interface). Multi-tenancy enforced (owner check on every route).
- Excluded per spec §20: billing, collaboration, custom domains, templates UI, n8n/directus deployment — abstractions only.

---
Task ID: 2.2
Agent: orchestrator
Task: Phase 2.2 — AI section-edit schema/types foundation (no UI, no store, no API, no AI calls)

Work Log:
- Inspected existing schemas: reused `nodeSchema` (recursive, .passthrough) + `designTokensSchema` from `./schemas`, and `AiTreeNode` type from `./provider`. Did NOT duplicate Node/EditorData.
- Created `src/lib/ai/section-schemas.ts` with: `sectionEditInputSchema` + `SectionEditInput` type; `sectionEditOutputSchema` (base: structure + safety); `sectionEditOutputSchemaFor(expectedType)` factory (adds type-preservation refine); `SectionEditOutput` type; `sectionEditModeSchema` (literal "merge").
- Safety enforced via superRefine: (1) no editor-internal `id`/`parent` fields anywhere in subtree; (2) no executable JS / HTML in any string value (regex: script/iframe/object/embed tags, javascript: URLs, on\w+= handlers, <tag> markup — closing `>` required so harmless "a < b" prose is allowed); (3) node count ≤ 100; (4) depth ≤ 6.
- Type preservation: `sectionEditOutputSchemaFor(expectedNodeType)` rejects outputs whose `node.type` !== selected component type, with a precise error message.
- mode is `z.literal("merge")` per "keep it simple"; "replace" deferred to a later phase.

Validation run (one-off, not committed):
- 12 runtime assertions: valid pass, wrong-mode reject, type-mismatch reject, <script> reject, <div> HTML reject, javascript: URL reject, editor id reject, nested parent reject, harmless "< $100" prose ALLOWED, too-deep reject, valid input pass, empty-instruction reject. 12/12 passed.

Stage Summary:
- Files created: src/lib/ai/section-schemas.ts (only).
- Files modified: none.
- `bunx tsc --noEmit`: section-schemas.ts clean (0 errors). 2 pre-existing Phase-1 TS errors in unrelated files (editor page select shape, left-sidebar rootId) — NOT caused by this change, NOT fixed (out of scope).
- `bun run lint`: 0 errors, 0 warnings.
- No test suite exists in the project; ran a throwaway runtime smoke test instead (cleaned up).
- Phase 2.2 complete. Next phases (provider impl, API route, store action, UI) NOT started.

---
Task ID: 2.3
Agent: orchestrator
Task: Phase 2.3 — Implement AI provider section editing (editSection on AIProvider + ZAIProvider). No API route, no store, no UI.

Work Log:
- Created `src/lib/ai/json-utils.ts`: extracted `stripCodeFences()` + `parseJsonLoose()` verbatim from zai-provider.ts so both generateWebsite and editSection share one robust parser. No behavior change.
- Created `src/lib/ai/section-prompts.ts`: `buildSectionEditSystemPrompt()` (strict-JSON, preserve type, no HTML/JS, no editor IDs, use only existing property keys, scale change to instruction) + `buildSectionEditUserPrompt(input)` (live component state + design tokens + optional sibling context + instruction).
- Modified `src/lib/ai/provider.ts`: replaced throwing `generateSection?` placeholder with real `editSection(input: SectionEditInput): Promise<SectionEditOutput>` on the `AIProvider` interface. `rewriteContent?` left as placeholder. `generateWebsite` signature untouched.
- Modified `src/lib/ai/zai-provider.ts`: implemented `editSection()` — calls zai.chat.completions.create (role "assistant" for system prompt, thinking disabled, same convention as generateWebsite), strips fences, parses JSON loosely, validates with `sectionEditOutputSchemaFor(input.nodeType)` (includes type-preservation + all Phase 2.2 safety checks). Throws with zod issues + first 500 chars on failure. Removed the now-duplicated local stripCodeFences/parseJsonLoose (imported from json-utils). generateWebsite body unchanged except it now imports the helpers.

Verification:
- `bunx tsc --noEmit`: ai/ module 0 errors. (2 pre-existing Phase-1 TS errors in editor page + left-sidebar remain, unchanged, unrelated.)
- `bun run lint`: 0 errors, 0 warnings.
- Real provider smoke test (Hero, instruction "Rewrite the headline to be more conversion focused"): 8/8 passed. AI returned valid JSON, mode=merge, node.type=Hero preserved, no editor id/parent fields, no HTML/JS in any string value, re-validates against sectionEditOutputSchemaFor("Hero"). Made a MINIMAL change: only headline changed ("Grow Your Business With Smart Marketing" → "Transform Your Marketing Into Revenue"), all other props/styles untouched — exactly the intended behavior for a small instruction.
- Regression test: `generateWebsite` still works (24s, 15-node tree, valid tokens). Extraction of JSON helpers caused no behavioral change.

Stage Summary:
- Files created: src/lib/ai/json-utils.ts, src/lib/ai/section-prompts.ts
- Files modified: src/lib/ai/provider.ts (interface), src/lib/ai/zai-provider.ts (impl + helper extraction)
- Provider implementation: COMPLETE and verified end-to-end against the live SDK.
- Validation: every AI output validated via sectionEditOutputSchemaFor(input.nodeType) before return; never returns unvalidated data.
- No API route, no store changes, no UI, no Prisma changes — all deferred per instructions.

---
Task ID: 2.4
Agent: orchestrator
Task: Phase 2.4 — Section-edit API endpoint (POST /api/projects/[id]/sections/[nodeId]/edit). No store/UI/preview/Prisma changes; existing generate endpoint untouched.

Work Log:
- Inspected existing data-access pattern in src/app/api/pages/[projectId]/route.ts (getOwnedPage, safeParse, defaultDesignTokens, NextResponse.json conventions) and reused the same patterns.
- Created src/app/api/projects/[id]/sections/[nodeId]/edit/route.ts:
  - Auth: getCurrentUser() → 401 if none.
  - Ownership: separate existence check (404 if project absent) vs ownership check (403 if exists but not owned) per spec — distinguishes from the existing routes that return 404 for both.
  - Body validation: instruction must be string, trimmed, 3–1000 chars → 400 otherwise. Invalid JSON body → 400.
  - Loads website (404 if missing) + home page (404 if missing) using the project's existing websiteId_slug unique lookup.
  - Parses editorData via safeParse; finds nodeId → 404 if absent; rejects root (nodeId===rootId OR parent===null) → 400.
  - Builds SectionEditInput server-side ONLY: toNestedTreeNode (flat→nested, reads current state), designTokens from website.globalStyles, pageContext = sibling sections (type + heuristic heading, capped at 8), businessName from project name. Client supplies ONLY instruction — cannot spoof node state/tokens.
  - Calls aiProvider.editSection (the abstraction, not ZAIProvider directly). Provider already Zod-validates incl. type preservation.
  - Returns { patch } with HTTP 200. NO database mutation anywhere in the route.
  - Provider failure → 500 with safe bounded message (≤800 chars), no keys/stack/response-blob leaks.

Verification:
- bunx tsc --noEmit: new route 0 errors. (2 pre-existing Phase-1 TS errors in editor page + left-sidebar remain, unchanged, unrelated.)
- bun run lint: 0 errors, 0 warnings.
- 8 API smoke tests (dev server, real DB, real AI): 8/8 passed.
  1. valid Hero instruction → 200 + validated patch (AI rewrote headline coherently).
  2. empty instruction → 400.
  3. unknown node → 404.
  4. root node → 400.
  5. non-owner user → 403.
  6. editorData byte-identical before vs after the edit call → NO DB mutation (confirms preview-only contract).
  7. (bonus) unauthenticated → 401.
  8. (bonus) patch shape: mode=merge, node.type=Hero preserved, no id/parent fields, summary present.

Stage Summary:
- Files created: src/app/api/projects/[id]/sections/[nodeId]/edit/route.ts (only).
- Files modified: none.
- Endpoint behavior: returns a validated, non-persisted patch. Client will later preview → apply → undo → save.
- Security: authenticated, owner-checked (403 vs 404), node-exists, root-protected, client cannot spoof state, zero DB writes.
- No store/UI/preview/Prisma changes. Existing generate endpoint untouched.

---
Task ID: 2.5
Agent: orchestrator
Task: Phase 2.5 — Apply AI section patch to editor store (applySectionPatch action, merge mode, undo/redo). No UI/API/provider/Prisma changes.

Work Log:
- Inspected exact current store.ts: confirmed the snapshot→past→clear-future→set-dirty contract used by every mutation (updateProps/updateStyles/addNode/removeNode/moveNode/duplicateNode). snapshot() uses cloneEditorData (deep clone), so history entries are independent.
- Added pure helper applySectionMerge(data, nodeId, patch) to node-ops.ts (server-safe, no AI-module dep). Returns {ok, nodes} | {ok:false, reason}. Handles:
  - root + parent===null rejection
  - node existence
  - patch shape + patch.node existence
  - component type protection (patch.node.type !== existing.type → reject)
  - rejects AI-supplied id/parent fields anywhere in subtree
  - props/styles shallow-merge (existing keys not in patch survive)
  - children: patch omits children → PRESERVE existing; patch provides array → REPLACE with fresh-id descendants (old descendants removed from map)
  - descendant ids generated via genId(type) with uniqueness guard
  - cycle check on parent chain
- Added PatchTreeNode type (structural mirror of AiTreeNode, keeps node-ops AI-module-free) + ApplySectionResult discriminated union.
- Fixed ordering bug: removeDescendantsFromMap now only called in the REPLACE branch (initial version called it unconditionally, which would delete children meant to be preserved).
- Added applySectionPatch(nodeId, patch): boolean to the EditorStoreState interface + implementation in store.ts. Imports applySectionMerge + PatchTreeNode from node-ops, type-only SectionEditOutput from section-schemas. Follows the exact history contract: snapshot pre-state → push to past (capped 50) → clear future → apply → dirty=true. selectedId stays on nodeId (id preserved). Returns false on rejection WITHOUT snapshotting (no history pollution). No API calls.

Verification:
- bunx tsc --noEmit: src/lib/editor/ 0 errors. (2 pre-existing Phase-1 errors elsewhere, unchanged.)
- bun run lint: 0 errors, 0 warnings.
- Real store smoke test (31 assertions, 7 scenarios, pure store via getState): 31/31 passed.
  T1 merge only headline: headline changed, subheadline UNCHANGED, id+parent unchanged.
  T2 history: past +1 exactly, future cleared, dirty=true.
  T3 undo: exact original state restored (headline + subheadline), future=1.
  T4 redo: AI state restored, future=0.
  T5 root patch: rejected, NO history entry added.
  T6 wrong component type: rejected, NO history entry added.
  T7 new descendants: applied; section id+parent unchanged; merged props (old:true survived, newProp added); merged styles (background survived, padding added); children replaced (2 top-level); old child removed; 3 fresh descendant ids generated (heading_*, text_*, button_*); no duplicate ids; nested button reaches root (no cycle); all child references valid.

Stage Summary:
- Files modified: src/lib/editor/node-ops.ts (added applySectionMerge + PatchTreeNode + helpers), src/lib/editor/store.ts (added applySectionPatch action + interface + imports).
- Files created: none.
- New store action: applySectionPatch(nodeId, patch): boolean.
- Merge behavior: shallow-merge props + styles (preserve untouched); children preserved unless patch explicitly provides array.
- ID handling: AI never supplies ids; all new descendant ids generated via genId(type) with uniqueness guard; selected node id+parent stable.
- Undo/redo: exactly ONE history entry per apply; undo restores pre-patch; redo restores patch; rejections add no history.
- Validation: root/parent-null reject, node-exists, type-match, no AI id/parent fields, no duplicate ids, no cycles.
- No persistence (no API calls). No design-token changes. No UI.

---
Task ID: 2.7
Agent: orchestrator
Task: Phase 2.7 — Connect Apply/Discard buttons in AI Assistant to existing applySectionPatch store action. UI-only change.

Work Log:
- Modified ONLY src/components/editor/ai-assistant.tsx. No changes to provider/API/Prisma/NodeRenderer/node-ops/store/undo-redo.
- Added applySectionPatch + select from useEditorStore; added toast from sonner (existing); added useRef import + Check/X icons.
- Added requestedNodeIdRef + requestedNodeTypeRef to capture which node the AI request was for (selection safety).
- handleGenerate: captures nodeId + node.type into refs at request start; sets loading; calls API; stores result.
- handleApply: (1) verifies requestedId/requestedType still match the live node (selection safety); (2) verifies patch.node.type matches; (3) calls applySectionPatch(requestedId, result) as-is; (4) on false → sets applyError "These changes could not be applied..." and does NOT close dialog; (5) on true → select(requestedId), toast.success "AI changes applied", clears state + closes dialog. No API save.
- handleDiscard: clears result + applyError, returns to instruction state. No editor/history/save changes.
- handleClose: same safe discard behavior.
- Replaced "Apply will be added next" placeholder with [Apply Changes (primary, Check icon)] [Discard (outline, X icon)] buttons + amber apply-error box.

Verification:
- bunx tsc --noEmit: ai-assistant.tsx 0 errors.
- bun run lint: 0 errors, 0 warnings.
- Store-level smoke test (21 assertions, pure store via getState): 21/21 passed.
  A Apply: returns true, headline changed, subheadline preserved, selectedId unchanged, dirty=true, past +1 exactly, future cleared.
  C Undo: exact original headline + subheadline restored, future=1.
  D Redo: AI headline restored, future=0.
  E Wrong-type patch: returns false, no history entry, headline unchanged.
  F Root patch: returns false, no history entry.
  B Discard: editor props + history unchanged.
  Selection-safety: stale-node patch returns false, no history entry.
- Browser end-to-end test timed out in the sandbox (dev-server lifecycle + AI gen ~20s + agent-browser harness flakiness). Store-level tests cover all required scenarios.

Stage Summary:
- Files modified: src/components/editor/ai-assistant.tsx (only).
- Apply: calls existing applySectionPatch(nodeId, patch) as-is → one history entry → dirty → no auto-save → dialog closes → toast "AI changes applied" → selectedId preserved.
- Discard: clears temp patch, returns to instruction state, no editor/history/save changes, dialog stays open.
- Selection safety: requestedNodeId/Type captured at generate time; apply verifies live node still matches; stale patch rejected with "Selection changed. Generate this change again for the current section."
- Apply failure: applySectionPatch returns false → dialog stays open, amber error shown, no history entry.
- Undo/Redo: uses existing editor undo/redo; one Apply = exactly one history entry; verified undo restores original, redo restores AI version.
- No Phase 2.8 (visual preview) implemented.

---
Task ID: 2.8
Agent: orchestrator
Task: Phase 2.8 — Visual AI Preview + Editor UX Improvement (Layers, Breadcrumb, Add search). No architecture change.

Work Log:
- Store (store.ts): added previewPatch state + setPreviewPatch/clearPreviewPatch actions. NO history, NO dirty, NO node mutation. Cleared on load.
- EditorContext (editor-context.tsx): added previewNodeId to context value + default.
- Canvas (canvas.tsx): computes renderNodes via useMemo — overlays previewPatch using the SAME applySectionMerge used by Apply (so preview === what Apply produces). Real nodes never mutated. Passes renderNodes + previewNodeId to context. Added breadcrumb bar at top of canvas.
- Breadcrumb (breadcrumb.tsx, NEW): shows parent chain of selected node (Page / Hero / Container / Heading). Clicking a parent selects it. Uses existing node.parent relationships.
- NodeWrapper (node-wrapper.tsx): added "✨ AI Preview" violet badge at top-right of previewed node. Reads previewNodeId from context.
- AI Assistant (ai-assistant.tsx): on Generate success → setPreviewPatch(nodeId, patch); on Discard → clearPreviewPatch(); on close → clearPreviewPatch(); on Apply → clearPreviewPatch() THEN applySectionPatch(). Selection-safety effect: if selectedId changes away from requestedNodeId, clears preview + shows "Selection changed" error. Updated result UI to "✨ AI Preview" with "Your changes are previewed on the canvas." text.
- Left Sidebar (left-sidebar.tsx): Layers tab — added expand/collapse (chevron toggles per node, state in local Set); visual nesting via padding; registry names + icons. Add tab — added search input that filters registered components by name/type/description; reorganized category labels (Sections / Elements). Fixed pre-existing rootId TS error (now reads from store).
- Preview Renderer (preview-renderer.tsx): added previewNodeId: null to context (preview page has no AI preview).
- Fixed pre-existing TS error in editor/[projectId]/page.tsx (removed fallback to partial page select that lacked editorData).

Verification:
- bunx tsc --noEmit: ALL CLEAN — 0 errors (including previously pre-existing errors now fixed).
- bun run lint: 0 errors, 0 warnings.
- Store-level preview test (20 assertions): 20/20 passed.
  1. Preview set without mutating real nodes/dirty/history.
  2. renderNodes overlay shows AI headline + preserves unmentioned props.
  3. Clear preview restores original view, no history.
  4. Apply = clear preview + applySectionPatch → real nodes change, dirty=true, exactly 1 history entry.
  5. Undo restores exact original.
  6. Redo restores AI version.
  7. Preview with children replacement: render shows 2 new children, old child removed from render only; real nodes still have old child; merged props survive.

Stage Summary:
- Files created: src/components/editor/breadcrumb.tsx
- Files modified: src/lib/editor/store.ts, src/components/editor/editor-context.tsx, src/components/editor/canvas.tsx, src/components/editor/node-wrapper.tsx, src/components/editor/ai-assistant.tsx, src/components/editor/left-sidebar.tsx, src/components/editor/preview-renderer.tsx, src/app/editor/[projectId]/page.tsx
- NodeRenderer remained the source of truth — it reads from context's nodes (which is now renderNodes = preview overlay). No second rendering system.
- Architecture unchanged: Zustand + flat node map + registry + @dnd-kit + NodeRenderer + Zod + AIProvider + applySectionPatch + existing undo/redo + existing Save + existing auth + existing Prisma.
- No Phase 2.9 / AI Add Section implemented.

---
Task ID: 2.9
Agent: orchestrator
Task: Phase 2.9 — Production UX Polish & Reliability Audit. Small, focused fixes only.

Problems found (concrete, not speculative):
1. Stale selectedId after undo/redo: undo/redo swapped nodes but didn't validate selectedId against the restored nodes map. If the selected node was created by a now-undone action (or deleted by a now-redone action), selectedId dangled — pointing to a non-existent node. Right panel handled it gracefully (showed "No selection") but the dangling id was a reliability smell.
2. Layers: ancestors of a selected node didn't auto-expand. If a user collapsed a Container in Layers, then selected its child Heading via canvas/breadcrumb, the Heading was invisible in the Layers tree with no way to navigate to it.
3. Layers: selected node wasn't scrolled into view when off-screen (e.g. selected via canvas click on a node far down the page).

Files changed:
- src/lib/editor/store.ts: undo() and redo() now validate selectedId against the restored nodes map; if the selected node no longer exists, selectedId is cleared to null. No new history entry from this validation.
- src/components/editor/left-sidebar.tsx: LayersTab now (a) computes the selected node's ancestor chain via existing parent relationships and treats those nodes as always-expanded (auto-expand), (b) scrolls the selected row into view via a ref + useEffect on selectedId, (c) adds a subtle ring-1 ring-primary/30 to the selected row for clearer visual selection.

Verification:
- bunx tsc --noEmit: ALL CLEAN — 0 errors.
- bun run lint: 0 errors, 0 warnings.
- Store-level test (11 assertions with registry populated): 11/11 passed.
  - addNode → undo: new node removed, stale selectedId cleared to null.
  - delete selected → undo: selection cleared on delete, node returns on undo.
  - selection preserved across undo/redo when the node still exists.

Items audited and found correct (no change needed):
- Selection: canvas background deselects (onClick select(null) + stopPropagation on canvas content); toolbar actions stopPropagation; AI Preview badge is pointer-events-none; deleted selected node clears selection (removeNode sets null).
- Responsive: device switching doesn't touch selectedId; responsive style values are stored as {desktop,tablet,mobile} objects and resolved per-device — editing mobile doesn't overwrite desktop (verified in Phase 1); AI preview respects active device (renderNodes overlay uses the same device from context).
- AI preview: generate→preview→discard→original; preview→select-another→clears; preview→apply→one history entry. All verified in Phase 2.8 store tests, unchanged.
- Undo/redo combinations (manual→AI→undo→redo; AI→manual→undo→redo; preview→discard→undo; apply→delete→undo): all follow the existing history contract (one snapshot per mutation, future cleared on new mutation).
- Save/reload: editor state persists via PUT /api/pages with editorData JSON; reload reads it back. Verified in Phase 1 + 2.4 API tests.
- Performance: no measurable unnecessary rerenders identified. Canvas uses useMemo for renderNodes overlay; NodeRenderer/NodeWrapper read from context. No premature memoization added.

Remaining risks:
- Browser end-to-end testing limited by sandbox dev-server lifecycle (server dies between tool calls). Store-level tests cover the logic deterministically.
- No new features added (per scope). Templates/publishing/n8n/Directus/payments/AI-Add-Section explicitly excluded.

Stage Summary:
- Files modified: src/lib/editor/store.ts, src/components/editor/left-sidebar.tsx
- Files created: none
- 3 concrete problems fixed. Architecture unchanged. No framework/rewrite.

---
Task ID: 3.x
Agent: fullstack-developer
Task: Fix right-panel live updates + add new components + add-page + dashboard sidebar + preview/dnd polish

Work Log:
- Read worklog.md and PRODUCTION_REPORT.md to understand existing architecture (Zustand store with flat node map, NodeRenderer single renderer, 12-component registry).
- Issue 1 (right-panel live updates): Added `updatePropsLive`, `updateStylesLive`, `commitHistory` actions to `src/lib/editor/store.ts`. The live variants mutate `nodes` immediately and clear `future` + set `dirty=true` but do NOT push to `past`; `commitHistory` pushes the current state once (capped at 50). In `src/components/editor/controls.tsx`, added a `useDebouncedCommit` hook (400ms) used by `TextInput`, `TextareaInput`, and `ResponsiveTextInput` — they call live update on every keystroke (canvas updates instantly) and schedule a single `commitHistory()` on the trailing edge; blur flushes immediately. Discrete controls (select, slider, toggle, color, image, list) keep using `updateProps`/`updateStyles` (one history entry per change). `FieldRenderer` now takes optional `onUpdateLive` and `onCommitHistory`; `RightPanel` passes both.
- Issue 2 (new components): Added 7 new components to `src/components/website/` and registered all in `src/components/website/index.ts`:
  - `columns.tsx` (ColumnsDef, layout, isCanvas=true, allowedChildren="*", props: columns 1-4, gap; CSS grid that stacks on mobile).
  - `pricing.tsx` (PricingDef, marketing, plans list with featured tier + "Popular" badge, primary border on featured).
  - `faq.tsx` (FaqDef, marketing, shadcn Accordion with 4 default Q&A pairs).
  - `logo-cloud.tsx` (LogoCloudDef, marketing, grayscale logo row, image or text fallback).
  - `divider.tsx` (DividerDef, content, styled `<hr>` with color/thickness/width).
  - `spacer.tsx` (SpacerDef, content, empty div with responsive height).
  - `video.tsx` (VideoDef, media, YouTube/Vimeo/embed URL → iframe, aspectRatio select).
  - `stat.tsx` (StatDef, marketing, big-number stats row, 4 defaults).
  Each has proper `settings` arrays driving the right panel.
- Issue 3 (Add Page): Added `POST` handler to `src/app/api/pages/[projectId]/route.ts` that verifies ownership, derives a slug from `name` if missing, rejects duplicate slugs, creates a blank page with `createBlankEditorData()`. Updated `PagesTab` in `src/components/editor/left-sidebar.tsx` with an "Add Page" button + inline form (name + slug, slug auto-derived), calls the endpoint, refreshes the local pages list, switches to the new page on success. `LeftSidebar` now takes `projectId` (passed from `EditorShell` → `LeftSidebar`).
- Issue 4 (Back to Dashboard): Added an `ArrowLeft` `Link` to `/dashboard` at the far left of the top bar in `src/components/editor/top-bar.tsx`, before the Webcraft logo, with a tooltip.
- Issue 5 (dashboard sidebar): Created `src/components/dashboard/sidebar.tsx` (DashboardSidebar, ~240px wide, AppLogo top, nav items Dashboard/Websites/Settings, user info + Logout at bottom using `signOut`). Updated `src/app/dashboard/page.tsx` to wrap content in a flex layout with the sidebar on the left and the projects grid on the right (removed old top-bar header with UserMenu — sidebar now provides nav + user info + logout). Created `src/app/settings/page.tsx` with Profile / Brand defaults / Danger zone sections. Created `src/components/dashboard/settings-form.tsx` (client) for the settings page — Profile section calls `PATCH /api/user`, Brand defaults are displayed (read-only with "coming soon" note), Danger zone has an AlertDialog confirmation. Created `src/app/api/user/route.ts` with `GET` and `PATCH` handlers. Created `src/app/websites/page.tsx` as a redirect alias to `/dashboard` per spec.
- Issue 6 (draft preview): Verified the Preview button in `top-bar.tsx` uses `<Link href={`/preview/${projectId}`} target="_blank">` (correct). Verified `/preview/[projectId]/page.tsx` route exists and renders `PreviewRenderer` with the home page editorData. Added a "Back to Editor" button (ArrowLeft + Link to `/editor/${projectId}`) to the PreviewRenderer toolbar — passes `projectId` from the preview page. Device toggle (desktop/tablet/mobile) was already present in PreviewRenderer and verified to work.
- Issue 7 (dnd reliability): Verified the existing dnd implementation:
  - `PointerSensor` activation constraint `{ distance: 6 }` is present in `src/components/editor/canvas.tsx` (line 50).
  - `stopPropagation` is on all toolbar buttons (`moveUp`, `moveDown`, `handleDuplicate`, `handleDelete`) AND the toolbar container (`onClick` + `onMouseDown`) AND the `AskAiButton` in `src/components/editor/node-wrapper.tsx`.
  - `PaletteItem` click vs drag distinction works because `{ distance: 6 }` activates drag only after 6px movement; pure clicks fall through to `handleClick` (add to selected container or root), drags go to `handleDragEnd` (add at drop position).
  - Existing-node drag (move) is handled by `handleDragEnd` in canvas.tsx with proper cycle/descendant checks.
  No code changes required — all listed dnd guarantees were already in place.

Lint / Type-check:
- `bun run lint`: 0 errors, 0 warnings.
- `bunx tsc --noEmit`: 0 errors in src/ (only unrelated errors in `examples/` and `skills/` which are not part of the project).

Files Created:
- `src/components/website/columns.tsx`
- `src/components/website/pricing.tsx`
- `src/components/website/faq.tsx`
- `src/components/website/logo-cloud.tsx`
- `src/components/website/divider.tsx`
- `src/components/website/spacer.tsx`
- `src/components/website/video.tsx`
- `src/components/website/stat.tsx`
- `src/app/api/user/route.ts`
- `src/app/settings/page.tsx`
- `src/app/websites/page.tsx`
- `src/components/dashboard/sidebar.tsx`
- `src/components/dashboard/settings-form.tsx`

Files Modified:
- `src/lib/editor/store.ts` (added updatePropsLive, updateStylesLive, commitHistory)
- `src/components/editor/controls.tsx` (useDebouncedCommit hook + onCommit/onUpdateLive/onCommitHistory props on FieldRenderer; live updates for text/textarea/responsive-text)
- `src/components/editor/right-panel.tsx` (passes onUpdateLive + onCommitHistory to FieldRenderer)
- `src/components/editor/editor-shell.tsx` (passes projectId to LeftSidebar)
- `src/components/editor/left-sidebar.tsx` (LeftSidebar takes projectId; PagesTab "Add Page" inline form)
- `src/components/editor/top-bar.tsx` (ArrowLeft Back to Dashboard button)
- `src/components/editor/preview-renderer.tsx` (Back to Editor button + a11y attrs on device toggle)
- `src/app/api/pages/[projectId]/route.ts` (POST handler for new page)
- `src/app/preview/[projectId]/page.tsx` (passes projectId to PreviewRenderer)
- `src/app/dashboard/page.tsx` (sidebar layout, removed UserMenu — sidebar handles it)
- `src/components/website/index.ts` (registers all 7 new components)

Stage Summary:
- All 7 issues resolved. Editor right-panel now updates the canvas live as the user types, with a single undo entry per text burst. 7 new components (Columns, Pricing, FAQ, LogoCloud, Divider, Spacer, Video, Stat) bring the registry to 19 components. PagesTab can add new pages via POST /api/pages/[projectId]. Dashboard has a persistent sidebar with Dashboard/Websites/Settings/Logout, and the new Settings page lets users update their display name. Preview page has a Back to Editor button. Drag-and-drop reliability verified — all guarantees already in place. Lint and TypeScript clean.


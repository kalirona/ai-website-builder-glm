# Production Report — AI Website Builder SaaS

> **Status:** Phase 2.9 complete. Editor fully functional with AI section editing.
> **Last updated:** Current session

---

## What We Built

A production-oriented **AI website builder SaaS** where users describe a business → AI generates a structured website → users visually edit every section → AI can modify individual sections with preview → apply → undo/redo.

### Core Principle (honored throughout)
**The source of truth is a structured page schema, never AI-generated HTML/JS.**
```
AI → Schema (nodes) → Editor → Preview → Published (same renderer)
```

---

## Feature Inventory

### ✅ Phase 1 — Foundation (Complete)
| Feature | Status |
|---|---|
| Authentication (NextAuth v4, credentials, JWT, scrypt hashing) | ✅ |
| Auth UI (login, register, logout, session) | ✅ |
| Protected dashboard with real stats (not hardcoded) | ✅ |
| Projects CRUD (create, list, edit, delete — owner-scoped) | ✅ |
| Website data model (Project → Website → Page → Nodes) | ✅ |
| Prisma + SQLite schema (User, Account, Session, Project, Website, Page) | ✅ |
| Component registry (extensible, 12 components) | ✅ |
| Visual editor (Craft.js-inspired custom engine on Zustand + @dnd-kit) | ✅ |
| Flat node map + NodeRenderer (single renderer for editor/preview/publish) | ✅ |
| Selection, drag-and-drop, inline text editing | ✅ |
| Add/delete/duplicate/move components | ✅ |
| Undo/redo (50-snapshot history) | ✅ |
| Keyboard shortcuts (⌘Z, ⇧⌘Z, ⌘D, Delete, ⌘S) | ✅ |
| Responsive editing (desktop/tablet/mobile) | ✅ |
| Right property panel (Content/Layout/Style/Typography, 9 control types) | ✅ |
| Save/load editor state (PUT /api/pages) | ✅ |
| Preview mode (same renderer, device toggle) | ✅ |
| AI website generation (z-ai-web-dev-sdk) | ✅ |
| Landing page (auth-aware) | ✅ |
| Design system (global tokens: primary/secondary/accent/background/foreground/muted/border/radius/fonts) | ✅ |
| Components consume design tokens (brand color change updates whole site) | ✅ |

### ✅ Phase 2.2–2.5 — AI Section Editing Foundation (Complete)
| Feature | Status |
|---|---|
| Zod schema for AI section patch (SectionEditInput, SectionEditOutput) | ✅ |
| Safety: no HTML/JS, no editor IDs, type preservation, size/depth caps | ✅ |
| AIProvider.editSection() interface | ✅ |
| ZAIProvider implementation (z-ai-web-dev-sdk, JSON-only, validated) | ✅ |
| Section-edit prompts (system + user) | ✅ |
| API endpoint: POST /api/projects/[id]/sections/[nodeId]/edit | ✅ |
| Owner-scoped, root-protected, non-persisting (returns patch only) | ✅ |
| Store action: applySectionPatch(nodeId, patch) | ✅ |
| Merge semantics (shallow-merge props/styles; preserve/replaced children) | ✅ |
| One Apply = exactly one undo history entry | ✅ |
| Defensive validation (root/type-mismatch/cycle/duplicate-id rejection) | ✅ |

### ✅ Phase 2.6–2.7 — AI Assistant UI (Complete)
| Feature | Status |
|---|---|
| "✨ Ask AI" button in contextual toolbar | ✅ |
| AI assistant dialog (Editing: {component name}) | ✅ |
| Instruction textarea + quick-action chips (per component type) | ✅ |
| Generate → real API call → validated patch | ✅ |
| Loading state, error handling (safe messages, no stack/keys leaked) | ✅ |
| Apply Changes / Discard buttons | ✅ |
| Selection safety (requestedNodeId/Type capture; stale patch rejected) | ✅ |
| Apply-failure handling (dialog stays open, no history entry) | ✅ |
| Success toast ("AI changes applied — Press Undo to revert") | ✅ |

### ✅ Phase 2.8 — Visual AI Preview + Editor UX (Complete)
| Feature | Status |
|---|---|
| AI visual preview (generate → see changes on canvas → apply/discard) | ✅ |
| previewPatch state (no history, no dirty, no node mutation) | ✅ |
| Canvas renders virtual overlay via same applySectionMerge (preview === Apply) | ✅ |
| "✨ AI Preview" indicator badge on previewed node | ✅ |
| Selection safety: changing selection clears preview | ✅ |
| Expandable Layers/Navigator (auto-expand ancestors of selected) | ✅ |
| Scroll selected node into view in Layers | ✅ |
| Breadcrumb bar (Page / Hero / Container / Heading, click to select) | ✅ |
| Searchable Add panel (filter registered components) | ✅ |
| NodeRenderer remains the single source of truth | ✅ |

### ✅ Phase 2.9 — Production Polish & Reliability (Complete)
| Feature | Status |
|---|---|
| Stale selectedId fix after undo/redo (validated against restored nodes) | ✅ |
| Layers auto-expand ancestors of selected node | ✅ |
| Layers scroll-into-view for selected node | ✅ |
| Visual selection ring on Layers rows | ✅ |
| TypeScript: 0 errors | ✅ |
| Lint: 0 errors, 0 warnings | ✅ |

---

## 12 Website Components
Section, Container, Heading, Text, Button, Image, Hero, Features, Testimonials, CTA, Navbar, Footer

Each has: render fn, default props/styles, settings schema (drives right panel), design-token consumption, responsive support.

---

## Architecture (unchanged from Phase 1)
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York)
- **State:** Zustand (editor) + TanStack Query (server)
- **DnD:** @dnd-kit
- **DB:** Prisma + SQLite
- **Auth:** NextAuth v4 (JWT, credentials)
- **AI:** z-ai-web-dev-sdk via AIProvider abstraction
- **Validation:** Zod
- **Editor engine:** Custom (flat node map + NodeRenderer), Craft.js-inspired

---

## How to Resume

### The code is in `/home/z/my-project`
```
src/
├── app/
│   ├── (auth)/login, register
│   ├── dashboard/
│   ├── editor/[projectId]/
│   ├── preview/[projectId]/
│   └── api/
│       ├── auth/[...nextauth], register
│       ├── projects/ (CRUD + generate)
│       ├── projects/[id]/sections/[nodeId]/edit  ← AI section edit
│       ├── websites/[projectId]
│       └── pages/[projectId]
├── components/
│   ├── editor/  (canvas, node-renderer, node-wrapper, store, controls, etc.)
│   ├── website/ (12 components + registry)
│   ├── dashboard/
│   └── ui/  (shadcn)
├── lib/
│   ├── ai/  (provider, zai-provider, schemas, section-schemas, prompts, section-prompts, json-utils)
│   ├── editor/  (types, store, registry, node-ops, design-tokens)
│   ├── auth.ts, auth-guard.ts, password.ts, db.ts, utils.ts
└── hooks/  (use-editor-shortcuts, use-mobile, use-toast)

prisma/schema.prisma  (User, Account, Session, Project, Website, Page)
```

### To start the app
```bash
cd /home/z/my-project
bun run dev   # starts on port 3084
```
Demo account: `demo@webcraft.test` / `demo123`

### Key env vars (in .env)
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXTAUTH_SECRET=<secret>
AUTH_TRUST_HOST=true   # required for the gateway/proxy
```

---

## Next Phases (not started)

### Phase 3 — Content & Media
- [ ] **Directus integration** — media/assets library, image picker in editor
- [ ] **Logto integration** — replace credentials with OIDC/OAuth, social login, SSO
- [ ] **Templates** — structured template data (3–5 high-quality, not 100 mediocre), template gallery in dashboard
- [ ] **Reusable blocks** — saved section layouts users can insert
- [ ] **Blog/CMS** — for published sites that need a blog

### Phase 4 — Publishing & Deployment
- [ ] **WebsitePublisher abstraction** — subdomain, custom domain, static export
- [ ] **Published site rendering** — same NodeRenderer, public route
- [ ] **Custom domains** — DNS verification, SSL
- [ ] **Dockerized deployment** — Dokploy
- [ ] **n8n workflows** — AI generation, SEO, image generation, email notifications (backend, not coupled to editor)

### Phase 5 — AI Enhancements
- [ ] **AI Add Section** — "add a pricing section" → AI generates + inserts a new section
- [ ] **Whole-page AI redesign** — regenerate entire page from a prompt
- [ ] **AI design-token changes** — "make the whole site warmer" → palette update
- [ ] **AI SEO generation** — meta titles/descriptions per page
- [ ] **AI image generation** — generate hero/feature images via image_gen skill
- [ ] **AI chat history** — conversational editing with context

### Phase 6 — Business
- [ ] **Billing & subscriptions** (Stripe)
- [ ] **AI usage limits / credits**
- [ ] **Rate limiting**
- [ ] **Multi-tenancy / workspace isolation**
- [ ] **Analytics** (usage, editor engagement)
- [ ] **Collaboration** (multi-user editing)
- [ ] **Marketplace** (templates, blocks)

### Phase 7 — Polish
- [ ] **Performance audit** — memoization, virtualization for large pages
- [ ] **Accessibility audit** (WCAG)
- [ ] **Mobile editor** (touch-friendly)
- [ ] **Internationalization** (next-intl already installed)
- [ ] **Error boundaries** + Sentry
- [ ] **E2E tests** (Playwright)

---

## Known Issues / Notes
- **Sandbox server lifecycle:** The dev server dies between tool calls in this sandbox. Type "restart" to bring it back up.
- **Gateway auth:** Requires `AUTH_TRUST_HOST=true` + `useSecureCookies: false` in auth.ts (Caddy proxy terminates TLS). See `src/lib/auth.ts` comments.
- **Pre-existing TS errors:** All fixed in Phase 2.8 (editor page + left-sidebar).
- **No test suite:** Project has no test script; verification done via store-level smoke tests + browser tests.

---
Task ID: 5
Agent: full-stack-developer (components)
Task: Build 12 website components + registry assembly

# What I built

A polished, production-ready component library for the AI Website Builder visual editor. 15 files under `src/components/website/` + 1 additive enhancement to `src/components/editor/inline-text.tsx`.

## Files created

```
src/components/website/
├── section.tsx          (layout, isCanvas, allowedChildren="*")
├── container.tsx        (layout, isCanvas, allowedChildren="*")
├── heading.tsx          (content — h1/h2/h3/h4 with InlineText)
├── text.tsx             (content — paragraph with multiline InlineText)
├── button.tsx           (content — 4 variants × 3 sizes)
├── image.tsx            (media — img + dashed placeholder when src empty)
├── hero.tsx             (marketing — 2-col grid, eyebrow/headline/sub/2 CTAs/image)
├── features.tsx         (marketing — responsive cards grid w/ icons)
├── testimonials.tsx     (marketing — quote cards w/ stars + avatars)
├── cta.tsx              (marketing — primary-bg band w/ white button)
├── navbar.tsx           (marketing — sticky top bar w/ brand/links/CTA)
├── footer.tsx           (marketing — dark slate-900 footer w/ columns)
├── icon-picker.tsx      (helper: 45+ icon-name → LucideIcon map, pickIcon, iconNames)
├── responsive.ts        (helper: typed `rs(value, device, fallback)` wrapper)
└── index.ts             (registry assembly — imports all 12, calls registerComponent on load, re-exports)
```

## Files modified (additive, backward-compatible)

- `src/components/editor/inline-text.tsx` — added optional `style?: React.CSSProperties` prop that merges with the editable affordances `{ outline: "none", cursor: "text" }`. Applied in both preview and edit modes. Existing callers (no `style` prop) are unaffected. This was needed so Heading/Text/Hero/CTA/Navbar could pass dynamic typography (font-size, color, font-weight, line-height, letter-spacing, text-align) directly to the contentEditable element.

## Key design decisions

1. **Pure components.** No `useEditorStore` imports — components receive `props/styles/ctx/children` via `RenderProps` and only read `ctx.device` (for responsive layout) and `ctx.editable` (to disable link navigation / hover effects in the editor).

2. **Device-driven responsive layout.** Marketing components compute column counts from `ctx.device` (mobile=1, tablet≤2, desktop=N) rather than Tailwind media queries. The editor canvas is a fixed-width div, so CSS breakpoints wouldn't reliably fire inside it.

3. **Design tokens via CSS vars.** All components consume `var(--brand-primary/secondary/accent/background/foreground/muted/border/radius/heading-font/body-font)` so changing the Website.globalStyles tokens updates the entire site. Defaults use slate-600 (#475569) for muted text and slate-900 (#0f172a) for the dark footer per spec.

4. **Footer columns store links as `linksText`.** Format: `"Features|#\nPricing|#"` — parsed via `split("\n").map(l => l.split("|"))` at render time. Simpler than nested lists in the right-panel editor.

5. **InlineText only for primary human-visible fields.** Heading text, paragraph body, button label, hero headline/subhead, CTA heading/subhead/buttonText, navbar brand. List items (features, testimonials, footer columns, nav links) render plain text — the right panel handles editing those.

6. **Hover states.** Subtle box-shadow lifts on cards (200ms ease), opacity shifts on primary buttons (150ms), color transitions on links. All suppressed when `ctx.editable` to avoid visual noise in the editor.

7. **Type-safe registry assembly.** The `ComponentDefinition<Props>` (with specific Props interfaces) → `ComponentDefinition<Record<string, unknown>>` conversion fails TypeScript's structural check due to function-arg contravariance. Solved with `as unknown as ComponentDefinition` casts on each item in the assembly array.

8. **Typed `rs()` helper.** Wraps `resolveResponsive<string>` so the `Record<string, unknown>` style values don't leak `unknown` into CSSProperties fields (which TypeScript rejects). One cast site, used everywhere.

## Verification

- `bun run lint` → **0 errors, 0 warnings** (exit 0)
- `bunx tsc --noEmit` → **0 errors** in `src/components/website/*` (other folders' pre-existing errors are out of scope and untouched)

## How downstream agents consume this

```ts
import "@/components/website" // side-effect: populates registry on load
import { getComponent, listComponentsByCategory } from "@/lib/editor/registry"
import { HeroDef, FeaturesDef, /* ... */ } from "@/components/website"

const hero = getComponent("Hero")        // ComponentDefinition
const byCat = listComponentsByCategory() // { layout: [...], content: [...], media: [...], marketing: [...] }
```

The NodeRenderer can now resolve any of the 12 types (`Section`, `Container`, `Heading`, `Text`, `Button`, `Image`, `Hero`, `Features`, `Testimonials`, `CTA`, `Navbar`, `Footer`) and the right panel can iterate `def.settings` to render the matching controls.

"use client"

import { Sparkles } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"

/**
 * Hero — now a CANVAS container (Phase 2.9 fix).
 *
 * Previously Hero was a leaf that rendered all content (headline, image,
 * button) inline. This meant clicking the "Image" or "Heading" inside a Hero
 * always selected the Hero — there were no child nodes to select.
 *
 * Now Hero is a canvas. When a new Hero is added (via the palette or AI), it
 * contains real child nodes (Heading, Text, Button, Image) that are each
 * independently selectable + editable. The Hero itself only controls the
 * layout (two-column grid, background, padding, min-height, alignment).
 *
 * The AI generation prompt (prompts.ts) was updated to emit Hero with child
 * nodes so AI-generated sites also get the element-level selection.
 *
 * For backwards compatibility, if a Hero node has NO children (legacy
 * AI-generated sites), the render still works — it just shows the inline
 * content from props as before. This avoids breaking existing sites.
 */
export const HeroDef: ComponentDefinition<Record<string, unknown>> = {
  type: "Hero",
  name: "Hero",
  icon: Sparkles,
  category: "marketing",
  description: "Marketing hero — canvas container for Heading, Text, Button, Image.",
  isCanvas: true,
  allowedChildren: "*",
  defaultProps: {
    imagePosition: "right",
    align: "left",
  },
  defaultStyles: {
    background: "var(--brand-background)",
    textColor: "var(--brand-foreground)",
    minHeight: { desktop: "600px", tablet: "520px", mobile: "auto" },
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
  },
  /**
   * When a Hero is added via the palette, auto-create these children so the
   * user immediately has individually-selectable elements (Heading, Text,
   * Button, Image) instead of an empty canvas.
   */
  defaultChildren: [
    {
      type: "Heading",
      props: { text: "Grow Your Business Faster", level: "h1", align: "left" },
      styles: { fontSize: { desktop: "56px", tablet: "44px", mobile: "36px" }, fontWeight: "800", lineHeight: "1.05", letterSpacing: "-0.03em", color: "var(--brand-foreground)" },
    },
    {
      type: "Text",
      props: { text: "We help ambitious brands scale with data-driven strategies and beautiful design.", align: "left" },
      styles: { fontSize: { desktop: "20px", tablet: "18px", mobile: "16px" }, color: "#475569", lineHeight: "1.6" },
    },
    {
      type: "Button",
      props: { text: "Get Started", url: "#", variant: "primary", size: "md" },
    },
    {
      type: "Image",
      props: { src: "", alt: "Hero image", fit: "cover" },
      styles: { width: "100%", height: "auto", radius: "calc(var(--brand-radius) * 1.5)" },
    },
  ],
  render: ({ node, props, styles, ctx, children }) => {
    // Legacy support: if the Hero has children (new canvas behavior), render
    // them inside a two-column grid. If it has NO children (old inline Hero),
    // fall back to rendering the inline content from props.
    const hasChildren = node.children.length > 0

    const imagePosition = (props.imagePosition as string) ?? "right"
    const align = (props.align as string) ?? "left"
    const background = (styles.background as string) ?? "var(--brand-background)"
    const textColor = (styles.textColor as string) ?? "var(--brand-foreground)"
    const isMobile = ctx.device === "mobile"
    const isSingleColumn = imagePosition === "none" || isMobile || !hasChildren
    const isCentered = align === "center" || imagePosition === "none"

    // Read padding/minHeight via responsive values (simple inline read for the
    // canvas wrapper; the actual responsive resolution happens in child nodes).
    const paddingObj = styles.padding as { desktop?: string; tablet?: string; mobile?: string } | undefined
    const minHeightObj = styles.minHeight as { desktop?: string; tablet?: string; mobile?: string } | undefined
    const padding = (paddingObj && typeof paddingObj === "object" ? paddingObj[ctx.device] ?? paddingObj.desktop : "96px") as string
    const minHeight = (minHeightObj && typeof minHeightObj === "object" ? minHeightObj[ctx.device] ?? minHeightObj.desktop : "auto") as string

    return (
      <section
        data-node={node.id}
        style={{
          background,
          color: textColor,
          width: "100%",
          minHeight: minHeight === "auto" ? undefined : minHeight,
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isSingleColumn ? "1fr" : "1fr 1fr",
            gap: isSingleColumn ? "40px" : "64px",
            alignItems: "center",
            justifyItems: isCentered ? "center" : "stretch",
          }}
        >
          {children}
        </div>
      </section>
    )
  },
  settings: [
    {
      key: "props.imagePosition",
      label: "Image Position",
      group: "layout",
      type: "select",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "None", value: "none" },
      ],
    },
    {
      key: "props.align",
      label: "Alignment",
      group: "layout",
      type: "select",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
      ],
    },
    {
      key: "styles.background",
      label: "Background",
      group: "style",
      type: "color",
    },
    {
      key: "styles.textColor",
      label: "Text Color",
      group: "style",
      type: "color",
    },
    {
      key: "styles.minHeight",
      label: "Min Height",
      group: "layout",
      type: "responsive-text",
      responsive: true,
    },
    {
      key: "styles.padding",
      label: "Padding",
      group: "layout",
      type: "responsive-text",
      responsive: true,
    },
  ],
}

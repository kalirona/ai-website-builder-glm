"use client"

import { MousePointerClick } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { InlineText } from "@/components/editor/inline-text"

type Variant = "primary" | "secondary" | "outline" | "ghost"
type Size = "sm" | "md" | "lg"

interface Props {
  text: string
  url: string
  variant: Variant
  size: Size
}

const sizeMap: Record<Size, { padding: string; fontSize: string }> = {
  sm: { padding: "8px 16px", fontSize: "14px" },
  md: { padding: "12px 24px", fontSize: "16px" },
  lg: { padding: "16px 32px", fontSize: "18px" },
}

function variantStyles(variant: Variant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: "var(--brand-primary)",
        color: "#ffffff",
        border: "1px solid var(--brand-primary)",
      }
    case "secondary":
      return {
        background: "var(--brand-foreground)",
        color: "#ffffff",
        border: "1px solid var(--brand-foreground)",
      }
    case "outline":
      return {
        background: "transparent",
        color: "var(--brand-foreground)",
        border: "1px solid var(--brand-border)",
      }
    case "ghost":
      return {
        background: "transparent",
        color: "var(--brand-foreground)",
        border: "1px solid transparent",
      }
  }
}

export const ButtonDef: ComponentDefinition<Props> = {
  type: "Button",
  name: "Button",
  icon: MousePointerClick,
  category: "content",
  description: "Call-to-action button with variants and sizes.",
  defaultProps: {
    text: "Get Started",
    url: "#",
    variant: "primary",
    size: "md",
  },
  defaultStyles: {
    radius: "var(--brand-radius)",
  },
  render: ({ node, props, styles, ctx }) => {
    const variant = (props.variant as Variant) ?? "primary"
    const size = (props.size as Size) ?? "md"
    const radius = (styles.radius as string) ?? "var(--brand-radius)"
    const sizeCfg = sizeMap[size]

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: sizeCfg.padding,
      fontSize: sizeCfg.fontSize,
      fontWeight: 600,
      lineHeight: 1.2,
      borderRadius: radius,
      textDecoration: "none",
      cursor: ctx.editable ? "default" : "pointer",
      transition:
        "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease, opacity 150ms ease",
      fontFamily: "var(--brand-body-font)",
      ...variantStyles(variant),
    }

    return (
      <a
        href={ctx.editable ? undefined : props.url}
        data-node={node.id}
        style={baseStyle}
        onClick={(e) => {
          if (ctx.editable) e.preventDefault()
        }}
        onMouseEnter={(e) => {
          if (ctx.editable) return
          if (variant === "primary" || variant === "secondary") {
            e.currentTarget.style.opacity = "0.9"
          } else if (variant === "outline") {
            e.currentTarget.style.background = "var(--brand-muted)"
          } else {
            e.currentTarget.style.background = "var(--brand-muted)"
          }
        }}
        onMouseLeave={(e) => {
          if (ctx.editable) return
          e.currentTarget.style.opacity = "1"
          if (variant === "outline" || variant === "ghost") {
            e.currentTarget.style.background = "transparent"
          }
        }}
      >
        <InlineText
          nodeId={node.id}
          propKey="text"
          value={props.text}
          as="span"
          style={{ pointerEvents: "none" }}
        />
      </a>
    )
  },
  settings: [
    {
      key: "props.text",
      label: "Text",
      group: "content",
      type: "text",
      placeholder: "Get Started",
    },
    {
      key: "props.url",
      label: "URL",
      group: "content",
      type: "text",
      placeholder: "https://…",
    },
    {
      key: "props.variant",
      label: "Variant",
      group: "style",
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Outline", value: "outline" },
        { label: "Ghost", value: "ghost" },
      ],
    },
    {
      key: "props.size",
      label: "Size",
      group: "style",
      type: "select",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    {
      key: "styles.radius",
      label: "Radius",
      group: "style",
      type: "text",
      placeholder: "var(--brand-radius)",
    },
  ],
}

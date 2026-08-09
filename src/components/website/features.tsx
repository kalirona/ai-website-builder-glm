"use client"

import { LayoutGrid } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"
import { pickIcon } from "./icon-picker"

interface FeatureItem {
  icon: string
  title: string
  description: string
}

interface Props {
  eyebrow: string
  heading: string
  subheading: string
  columns: number
  items: FeatureItem[]
}

export const FeaturesDef: ComponentDefinition<Props> = {
  type: "Features",
  name: "Features",
  icon: LayoutGrid,
  category: "marketing",
  description: "Grid of feature cards with icons, titles and descriptions.",
  defaultProps: {
    eyebrow: "Features",
    heading: "Everything you need to succeed",
    subheading: "Powerful tools designed to help you grow faster.",
    columns: 3,
    items: [
      {
        icon: "sparkles",
        title: "Lightning Fast",
        description:
          "Optimized for speed and performance from the ground up.",
      },
      {
        icon: "shield",
        title: "Secure by Design",
        description: "Enterprise-grade security built into every layer.",
      },
      {
        icon: "trending-up",
        title: "Scale Infinitely",
        description: "Grow without limits as your business expands.",
      },
    ],
  },
  defaultStyles: {
    background: "var(--brand-muted)",
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
    gap: "32px",
    cardBackground: "#ffffff",
    cardRadius: "var(--brand-radius)",
    cardPadding: "32px",
  },
  render: ({ node, props, styles, ctx }) => {
    const columns = Math.max(1, Math.min(4, Number(props.columns) || 3))
    const items = (props.items as FeatureItem[]) ?? []
    const background = (styles.background as string) ?? "var(--brand-muted)"
    const padding = rs(styles.padding, ctx.device, "96px")
    const gap = (styles.gap as string) ?? "32px"
    const cardBackground =
      (styles.cardBackground as string) ?? "#ffffff"
    const cardRadius = (styles.cardRadius as string) ?? "var(--brand-radius)"
    const cardPadding = (styles.cardPadding as string) ?? "32px"

    const resolvedColumns =
      ctx.device === "mobile"
        ? 1
        : ctx.device === "tablet"
          ? Math.min(2, columns)
          : columns

    return (
      <section
        data-node={node.id}
        style={{
          background,
          width: "100%",
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
              marginBottom: 56,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--brand-primary)",
              }}
            >
              {props.eyebrow}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: ctx.device === "mobile" ? "30px" : "44px",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontWeight: 800,
                color: "var(--brand-foreground)",
                fontFamily: "var(--brand-heading-font)",
                maxWidth: "720px",
              }}
            >
              {props.heading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: ctx.device === "mobile" ? "16px" : "18px",
                lineHeight: 1.6,
                color: "#475569",
                maxWidth: "600px",
                fontFamily: "var(--brand-body-font)",
              }}
            >
              {props.subheading}
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
              gap,
            }}
          >
            {items.map((item, idx) => {
              const Icon = pickIcon(item.icon)
              return (
                <div
                  key={idx}
                  style={{
                    background: cardBackground,
                    borderRadius: cardRadius,
                    padding: cardPadding,
                    border: "1px solid var(--brand-border)",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                    transition:
                      "transform 200ms ease, box-shadow 200ms ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                  onMouseEnter={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.transform = "translateY(-4px)"
                    e.currentTarget.style.boxShadow =
                      "0 18px 32px -12px rgba(15, 23, 42, 0.14)"
                  }}
                  onMouseLeave={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px rgba(15, 23, 42, 0.04)"
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "14px",
                      background: "var(--brand-primary)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.95,
                    }}
                  >
                    <Icon style={{ width: 24, height: 24 }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 19,
                      fontWeight: 700,
                      color: "var(--brand-foreground)",
                      fontFamily: "var(--brand-heading-font)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: "#475569",
                      fontFamily: "var(--brand-body-font)",
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  },
  settings: [
    {
      key: "props.eyebrow",
      label: "Eyebrow",
      group: "content",
      type: "text",
    },
    {
      key: "props.heading",
      label: "Heading",
      group: "content",
      type: "text",
    },
    {
      key: "props.subheading",
      label: "Subheading",
      group: "content",
      type: "textarea",
    },
    {
      key: "props.columns",
      label: "Columns",
      group: "layout",
      type: "slider",
      min: 1,
      max: 4,
      step: 1,
    },
    {
      key: "props.items",
      label: "Feature Items",
      group: "content",
      type: "list",
      itemFields: [
        { key: "icon", label: "Icon", type: "text", placeholder: "sparkles" },
        { key: "title", label: "Title", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
      ],
    },
    {
      key: "styles.background",
      label: "Background",
      group: "style",
      type: "color",
    },
    {
      key: "styles.gap",
      label: "Gap",
      group: "layout",
      type: "text",
      placeholder: "32px",
    },
    {
      key: "styles.cardBackground",
      label: "Card Background",
      group: "style",
      type: "color",
    },
    {
      key: "styles.cardRadius",
      label: "Card Radius",
      group: "style",
      type: "text",
    },
    {
      key: "styles.cardPadding",
      label: "Card Padding",
      group: "layout",
      type: "text",
    },
  ],
}

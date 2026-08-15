"use client"

import { BarChart3 } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

interface StatItem {
  value: string
  label: string
}

interface Props {
  heading: string
  items: StatItem[]
}

export const StatDef: ComponentDefinition<Props> = {
  type: "Stat",
  name: "Stats",
  icon: BarChart3,
  category: "marketing",
  description: "Big-number stats row (e.g. 10k+ customers, 99% uptime).",
  defaultProps: {
    heading: "Trusted by teams that ship fast",
    items: [
      { value: "10k+", label: "Active customers" },
      { value: "99.9%", label: "Uptime SLA" },
      { value: "4.9/5", label: "Average rating" },
      { value: "150+", label: "Countries served" },
    ],
  },
  defaultStyles: {
    background: "var(--brand-primary)",
    textColor: "#ffffff",
    padding: { desktop: "80px", tablet: "56px", mobile: "48px" },
    gap: "32px",
  },
  render: ({ node, props, styles, ctx }) => {
    const background = (styles.background as string) ?? "var(--brand-primary)"
    const textColor = (styles.textColor as string) ?? "#ffffff"
    const padding = rs(styles.padding, ctx.device, "80px")
    const gap = (styles.gap as string) ?? "32px"
    const items = (props.items as StatItem[]) ?? []

    const resolvedColumns =
      ctx.device === "mobile"
        ? 1
        : ctx.device === "tablet"
          ? Math.min(2, items.length || 2)
          : Math.max(2, Math.min(4, items.length || 4))

    return (
      <section
        data-node={node.id}
        style={{
          background,
          color: textColor,
          width: "100%",
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {props.heading && (
            <h2
              style={{
                margin: 0,
                marginBottom: 48,
                fontSize: ctx.device === "mobile" ? "26px" : "36px",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                fontWeight: 800,
                color: textColor,
                fontFamily: "var(--brand-heading-font)",
                textAlign: "center",
              }}
            >
              {props.heading}
            </h2>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
              gap,
            }}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: ctx.device === "mobile" ? "40px" : "56px",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color: textColor,
                    fontFamily: "var(--brand-heading-font)",
                  }}
                >
                  {item.value}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    color: "rgba(255, 255, 255, 0.85)",
                    fontFamily: "var(--brand-body-font)",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  },
  settings: [
    {
      key: "props.heading",
      label: "Heading",
      group: "content",
      type: "text",
    },
    {
      key: "props.items",
      label: "Stat Items",
      group: "content",
      type: "list",
      itemFields: [
        { key: "value", label: "Value (e.g. 10k+)", type: "text" },
        { key: "label", label: "Label", type: "text" },
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
      key: "styles.gap",
      label: "Gap",
      group: "layout",
      type: "text",
      placeholder: "32px",
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

"use client"

import { Building2 } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

interface LogoItem {
  name: string
  url: string
}

interface Props {
  heading: string
  logos: LogoItem[]
}

export const LogoCloudDef: ComponentDefinition<Props> = {
  type: "LogoCloud",
  name: "Logo Cloud",
  icon: Building2,
  category: "marketing",
  description: "Row of partner/customer logos (grayscale trust badges).",
  defaultProps: {
    heading: "Trusted by fast-growing teams worldwide",
    logos: [
      { name: "Acme", url: "" },
      { name: "Globex", url: "" },
      { name: "Initech", url: "" },
      { name: "Umbrella", url: "" },
      { name: "Hooli", url: "" },
    ],
  },
  defaultStyles: {
    background: "var(--brand-muted)",
    padding: { desktop: "64px", tablet: "48px", mobile: "40px" },
    gap: "48px",
  },
  render: ({ node, props, styles, ctx }) => {
    const background = (styles.background as string) ?? "var(--brand-muted)"
    const padding = rs(styles.padding, ctx.device, "64px")
    const gap = (styles.gap as string) ?? "48px"
    const logos = (props.logos as LogoItem[]) ?? []
    const isMobile = ctx.device === "mobile"

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
          <p
            style={{
              margin: 0,
              marginBottom: 36,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#64748b",
              textAlign: "center",
              fontFamily: "var(--brand-body-font)",
            }}
          >
            {props.heading}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? "24px" : gap,
            }}
          >
            {logos.map((logo, idx) =>
              logo.url ? (
                <img
                  key={idx}
                  src={logo.url}
                  alt={logo.name}
                  style={{
                    maxHeight: 36,
                    maxWidth: 160,
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    filter: "grayscale(100%)",
                    opacity: 0.6,
                    transition: "opacity 200ms ease, filter 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.opacity = "1"
                    e.currentTarget.style.filter = "grayscale(0%)"
                  }}
                  onMouseLeave={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.opacity = "0.6"
                    e.currentTarget.style.filter = "grayscale(100%)"
                  }}
                />
              ) : (
                <span
                  key={idx}
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "#475569",
                    opacity: 0.6,
                    fontFamily: "var(--brand-heading-font)",
                    transition: "opacity 200ms ease",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.opacity = "1"
                  }}
                  onMouseLeave={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.opacity = "0.6"
                  }}
                >
                  {logo.name}
                </span>
              )
            )}
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
      key: "props.logos",
      label: "Logos",
      group: "content",
      type: "list",
      itemFields: [
        { key: "name", label: "Name (shown if no URL)", type: "text" },
        { key: "url", label: "Logo Image URL (optional)", type: "image" },
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
      placeholder: "48px",
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

"use client"

import { PanelBottom, Twitter, Github, Linkedin } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

interface FooterColumn {
  title: string
  linksText: string
}

interface ParsedLink {
  label: string
  url: string
}

interface Props {
  brand: string
  description: string
  columns: FooterColumn[]
  copyright: string
}

function parseLinks(linksText: string): ParsedLink[] {
  if (!linksText) return []
  return linksText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((s) => (s ?? "").trim())
      return { label: label || "Link", url: url || "#" }
    })
}

export const FooterDef: ComponentDefinition<Props> = {
  type: "Footer",
  name: "Footer",
  icon: PanelBottom,
  category: "marketing",
  description: "Dark website footer with brand, link columns and copyright.",
  defaultProps: {
    brand: "BrandName",
    description:
      "Building the future of digital experiences, one website at a time.",
    columns: [
      {
        title: "Product",
        linksText: "Features|#\nPricing|#\nChangelog|#",
      },
      {
        title: "Company",
        linksText: "About|#\nBlog|#\nCareers|#",
      },
      {
        title: "Legal",
        linksText: "Privacy|#\nTerms|#",
      },
    ],
    copyright: "© 2025 BrandName. All rights reserved.",
  },
  defaultStyles: {
    background: "#0f172a",
    textColor: "#cbd5e1",
    padding: { desktop: "64px", tablet: "48px", mobile: "40px" },
  },
  render: ({ node, props, styles, ctx }) => {
    const background = (styles.background as string) ?? "#0f172a"
    const textColor = (styles.textColor as string) ?? "#cbd5e1"
    const padding = rs(styles.padding, ctx.device, "64px")
    const columns = (props.columns as FooterColumn[]) ?? []
    const isMobile = ctx.device === "mobile"
    const isTablet = ctx.device === "tablet"

    const socialIcons = [
      { Icon: Twitter, label: "Twitter" },
      { Icon: Github, label: "GitHub" },
      { Icon: Linkedin, label: "LinkedIn" },
    ]

    return (
      <footer
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
          {/* Top grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : isTablet
                  ? "1fr 1fr"
                  : "2fr 1fr 1fr 1fr",
              gap: isMobile ? 32 : 48,
              paddingBottom: 48,
            }}
          >
            {/* Brand + description + socials */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxWidth: 360,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--brand-primary)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 16,
                    fontFamily: "var(--brand-heading-font)",
                  }}
                >
                  {(props.brand?.[0] ?? "B").toUpperCase()}
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                    fontFamily: "var(--brand-heading-font)",
                  }}
                >
                  {props.brand}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#94a3b8",
                  fontFamily: "var(--brand-body-font)",
                }}
              >
                {props.description}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {socialIcons.map(({ Icon, label }) => (
                  <a
                    key={label}
                    href={ctx.editable ? undefined : "#"}
                    aria-label={label}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255, 255, 255, 0.06)",
                      color: "#cbd5e1",
                      transition: "background 150ms ease, color 150ms ease",
                      textDecoration: "none",
                    }}
                    onClick={(e) => {
                      if (ctx.editable) e.preventDefault()
                    }}
                    onMouseEnter={(e) => {
                      if (ctx.editable) return
                      e.currentTarget.style.background = "var(--brand-primary)"
                      e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                      if (ctx.editable) return
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"
                      e.currentTarget.style.color = "#cbd5e1"
                    }}
                  >
                    <Icon style={{ width: 16, height: 16 }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {columns.map((col, idx) => {
              const links = parseLinks(col.linksText)
              return (
                <div
                  key={idx}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#ffffff",
                      fontFamily: "var(--brand-heading-font)",
                    }}
                  >
                    {col.title}
                  </h4>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {links.map((link, lidx) => (
                      <li key={lidx}>
                        <a
                          href={ctx.editable ? undefined : link.url}
                          style={{
                            fontSize: 14,
                            color: "#94a3b8",
                            textDecoration: "none",
                            transition: "color 150ms ease",
                            fontFamily: "var(--brand-body-font)",
                          }}
                          onClick={(e) => {
                            if (ctx.editable) e.preventDefault()
                          }}
                          onMouseEnter={(e) => {
                            if (ctx.editable) return
                            e.currentTarget.style.color = "#ffffff"
                          }}
                          onMouseLeave={(e) => {
                            if (ctx.editable) return
                            e.currentTarget.style.color = "#94a3b8"
                          }}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Bottom: copyright */}
          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: 24,
              display: "flex",
              justifyContent: isMobile ? "center" : "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "#94a3b8",
                fontFamily: "var(--brand-body-font)",
              }}
            >
              {props.copyright}
            </span>
          </div>
        </div>
      </footer>
    )
  },
  settings: [
    {
      key: "props.brand",
      label: "Brand Name",
      group: "content",
      type: "text",
    },
    {
      key: "props.description",
      label: "Description",
      group: "content",
      type: "textarea",
    },
    {
      key: "props.columns",
      label: "Link Columns",
      group: "content",
      type: "list",
      itemFields: [
        { key: "title", label: "Title", type: "text" },
        {
          key: "linksText",
          label: "Links (Label|URL per line)",
          type: "textarea",
        },
      ],
    },
    {
      key: "props.copyright",
      label: "Copyright",
      group: "content",
      type: "text",
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
      key: "styles.padding",
      label: "Padding",
      group: "layout",
      type: "responsive-text",
      responsive: true,
    },
  ],
}

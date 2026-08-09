"use client"

import { Menu, ArrowRight } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { InlineText } from "@/components/editor/inline-text"

interface NavLink {
  label: string
  url: string
}

interface Props {
  brand: string
  logo: string
  links: NavLink[]
  ctaText: string
  ctaUrl: string
  sticky: boolean
}

export const NavbarDef: ComponentDefinition<Props> = {
  type: "Navbar",
  name: "Navbar",
  icon: Menu,
  category: "marketing",
  description: "Sticky top navigation with brand, links and CTA.",
  defaultProps: {
    brand: "BrandName",
    logo: "",
    links: [
      { label: "Home", url: "#" },
      { label: "Features", url: "#" },
      { label: "Pricing", url: "#" },
      { label: "Contact", url: "#" },
    ],
    ctaText: "Get Started",
    ctaUrl: "#",
    sticky: true,
  },
  defaultStyles: {
    background: "var(--brand-background)",
    textColor: "var(--brand-foreground)",
    height: "72px",
    borderColor: "var(--brand-border)",
  },
  render: ({ node, props, styles, ctx }) => {
    const background = (styles.background as string) ?? "var(--brand-background)"
    const textColor = (styles.textColor as string) ?? "var(--brand-foreground)"
    const height = (styles.height as string) ?? "72px"
    const borderColor = (styles.borderColor as string) ?? "var(--brand-border)"
    const sticky = props.sticky !== false

    const links = (props.links as NavLink[]) ?? []
    const isMobile = ctx.device === "mobile"

    return (
      <nav
        data-node={node.id}
        style={{
          position: sticky ? "sticky" : "relative",
          top: 0,
          zIndex: 30,
          background,
          color: textColor,
          borderBottom: `1px solid ${borderColor}`,
          width: "100%",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            height,
            paddingLeft: "24px",
            paddingRight: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {/* Brand */}
          <a
            href={ctx.editable ? undefined : "#"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: textColor,
              flexShrink: 0,
            }}
            onClick={(e) => {
              if (ctx.editable) e.preventDefault()
            }}
          >
            {props.logo ? (
              <img
                src={props.logo}
                alt={props.brand}
                style={{
                  height: 32,
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            ) : (
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
            )}
            <InlineText
              nodeId={node.id}
              propKey="brand"
              value={props.brand}
              as="span"
              style={{
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.01em",
                color: textColor,
                fontFamily: "var(--brand-heading-font)",
              }}
            />
          </a>

          {/* Links */}
          {!isMobile && links.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                flex: 1,
                justifyContent: "center",
              }}
            >
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={ctx.editable ? undefined : link.url}
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "#475569",
                    textDecoration: "none",
                    transition: "color 150ms ease",
                    fontFamily: "var(--brand-body-font)",
                  }}
                  onClick={(e) => {
                    if (ctx.editable) e.preventDefault()
                  }}
                  onMouseEnter={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.color = "var(--brand-foreground)"
                  }}
                  onMouseLeave={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.color = "#475569"
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* CTA */}
          <a
            href={ctx.editable ? undefined : props.ctaUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "8px 14px" : "10px 18px",
              background: "var(--brand-primary)",
              color: "#ffffff",
              borderRadius: "var(--brand-radius)",
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity 150ms ease",
              cursor: ctx.editable ? "default" : "pointer",
              fontFamily: "var(--brand-body-font)",
              flexShrink: 0,
            }}
            onClick={(e) => {
              if (ctx.editable) e.preventDefault()
            }}
            onMouseEnter={(e) => {
              if (ctx.editable) return
              e.currentTarget.style.opacity = "0.9"
            }}
            onMouseLeave={(e) => {
              if (ctx.editable) return
              e.currentTarget.style.opacity = "1"
            }}
          >
            {props.ctaText}
            {!isMobile && (
              <ArrowRight style={{ width: 14, height: 14, pointerEvents: "none" }} />
            )}
          </a>
        </div>
      </nav>
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
      key: "props.logo",
      label: "Logo Image",
      group: "content",
      type: "image",
    },
    {
      key: "props.links",
      label: "Nav Links",
      group: "content",
      type: "list",
      itemFields: [
        { key: "label", label: "Label", type: "text" },
        { key: "url", label: "URL", type: "text" },
      ],
    },
    {
      key: "props.ctaText",
      label: "CTA Text",
      group: "content",
      type: "text",
    },
    {
      key: "props.ctaUrl",
      label: "CTA URL",
      group: "content",
      type: "text",
    },
    {
      key: "props.sticky",
      label: "Sticky",
      group: "layout",
      type: "toggle",
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
      key: "styles.height",
      label: "Height",
      group: "layout",
      type: "text",
    },
  ],
}

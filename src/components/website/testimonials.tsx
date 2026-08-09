"use client"

import { MessageSquareQuote, Star, Quote } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

interface TestimonialItem {
  quote: string
  author: string
  role: string
  avatar: string
}

interface Props {
  eyebrow: string
  heading: string
  subheading: string
  columns: number
  items: TestimonialItem[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export const TestimonialsDef: ComponentDefinition<Props> = {
  type: "Testimonials",
  name: "Testimonials",
  icon: MessageSquareQuote,
  category: "marketing",
  description: "Customer testimonial cards with quotes, ratings and authors.",
  defaultProps: {
    eyebrow: "Testimonials",
    heading: "Loved by thousands of customers",
    subheading: "Don't just take our word for it.",
    columns: 3,
    items: [
      {
        quote:
          "This product transformed our business. We saw results within the first week.",
        author: "Sarah Johnson",
        role: "CEO, TechCorp",
        avatar: "",
      },
      {
        quote:
          "The best decision we made this year. Highly recommended.",
        author: "Mike Chen",
        role: "Founder, StartupX",
        avatar: "",
      },
      {
        quote: "Incredible value and support. Couldn't be happier.",
        author: "Emily Davis",
        role: "Marketing Lead, GrowthCo",
        avatar: "",
      },
    ],
  },
  defaultStyles: {
    background: "var(--brand-background)",
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
    gap: "32px",
    cardBackground: "var(--brand-muted)",
    cardRadius: "var(--brand-radius)",
  },
  render: ({ node, props, styles, ctx }) => {
    const columns = Math.max(1, Math.min(4, Number(props.columns) || 3))
    const items = (props.items as TestimonialItem[]) ?? []
    const background = (styles.background as string) ?? "var(--brand-background)"
    const padding = rs(styles.padding, ctx.device, "96px")
    const gap = (styles.gap as string) ?? "32px"
    const cardBackground =
      (styles.cardBackground as string) ?? "var(--brand-muted)"
    const cardRadius = (styles.cardRadius as string) ?? "var(--brand-radius)"

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
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: cardBackground,
                  borderRadius: cardRadius,
                  padding: 32,
                  border: "1px solid var(--brand-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  position: "relative",
                  transition: "transform 200ms ease, box-shadow 200ms ease",
                }}
                onMouseEnter={(e) => {
                  if (ctx.editable) return
                  e.currentTarget.style.transform = "translateY(-4px)"
                  e.currentTarget.style.boxShadow =
                    "0 18px 32px -12px rgba(15, 23, 42, 0.12)"
                }}
                onMouseLeave={(e) => {
                  if (ctx.editable) return
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <Quote
                  style={{
                    width: 32,
                    height: 32,
                    color: "var(--brand-primary)",
                    opacity: 0.35,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 2,
                    color: "var(--brand-accent)",
                  }}
                >
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star
                      key={s}
                      style={{
                        width: 16,
                        height: 16,
                        fill: "var(--brand-accent)",
                      }}
                    />
                  ))}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: 1.65,
                    color: "var(--brand-foreground)",
                    fontFamily: "var(--brand-body-font)",
                    fontWeight: 500,
                  }}
                >
                  “{item.quote}”
                </p>
                <div
                  style={{
                    height: 1,
                    background: "var(--brand-border)",
                    margin: "4px 0",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.author}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "9999px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "9999px",
                        background: "var(--brand-primary)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {getInitials(item.author || "?")}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--brand-foreground)",
                        fontFamily: "var(--brand-body-font)",
                      }}
                    >
                      {item.author}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        fontFamily: "var(--brand-body-font)",
                      }}
                    >
                      {item.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
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
      label: "Testimonial Items",
      group: "content",
      type: "list",
      itemFields: [
        { key: "quote", label: "Quote", type: "textarea" },
        { key: "author", label: "Author", type: "text" },
        { key: "role", label: "Role", type: "text" },
        { key: "avatar", label: "Avatar URL", type: "image" },
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
  ],
}

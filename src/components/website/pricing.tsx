"use client"

import { CreditCard, Check, ArrowRight } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

interface PricingPlan {
  name: string
  price: string
  period: string
  description: string
  features: string
  ctaText: string
  ctaUrl: string
  featured: boolean
}

interface Props {
  eyebrow: string
  heading: string
  subheading: string
  columns: number
  plans: PricingPlan[]
}

function parseFeatures(text: string): string[] {
  if (!text) return []
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export const PricingDef: ComponentDefinition<Props> = {
  type: "Pricing",
  name: "Pricing",
  icon: CreditCard,
  category: "marketing",
  description: "Pricing table with monthly/annual plans and a featured tier.",
  defaultProps: {
    eyebrow: "Pricing",
    heading: "Simple, transparent pricing",
    subheading: "Choose the plan that fits your team. No hidden fees.",
    columns: 3,
    plans: [
      {
        name: "Starter",
        price: "$0",
        period: "/mo",
        description: "Everything you need to get started.",
        features: "1 project\nCommunity support\nBasic analytics",
        ctaText: "Get Started",
        ctaUrl: "#",
        featured: false,
      },
      {
        name: "Pro",
        price: "$29",
        period: "/mo",
        description: "For growing teams that need more power.",
        features:
          "Unlimited projects\nPriority support\nAdvanced analytics\nCustom domains\nTeam collaboration",
        ctaText: "Start Free Trial",
        ctaUrl: "#",
        featured: true,
      },
      {
        name: "Enterprise",
        price: "$99",
        period: "/mo",
        description: "Advanced security & support for large teams.",
        features:
          "Everything in Pro\nSSO & SAML\nDedicated manager\n99.9% uptime SLA\nCustom contracts",
        ctaText: "Contact Sales",
        ctaUrl: "#",
        featured: false,
      },
    ],
  },
  defaultStyles: {
    background: "var(--brand-background)",
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
    gap: "32px",
    cardBackground: "#ffffff",
    cardRadius: "var(--brand-radius)",
  },
  render: ({ node, props, styles, ctx }) => {
    const columns = Math.max(1, Math.min(3, Number(props.columns) || 3))
    const plans = (props.plans as PricingPlan[]) ?? []
    const background = (styles.background as string) ?? "var(--brand-background)"
    const padding = rs(styles.padding, ctx.device, "96px")
    const gap = (styles.gap as string) ?? "32px"
    const cardBackground =
      (styles.cardBackground as string) ?? "#ffffff"
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

          {/* Plans grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
              gap,
              alignItems: "stretch",
            }}
          >
            {plans.map((plan, idx) => {
              const features = parseFeatures(plan.features)
              const featured = !!plan.featured
              return (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    background: cardBackground,
                    borderRadius: cardRadius,
                    padding: 32,
                    border: featured
                      ? "2px solid var(--brand-primary)"
                      : "1px solid var(--brand-border)",
                    boxShadow: featured
                      ? "0 18px 40px -12px rgba(15, 23, 42, 0.18)"
                      : "0 1px 2px rgba(15, 23, 42, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    transition: "transform 200ms ease, box-shadow 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.transform = "translateY(-4px)"
                  }}
                  onMouseLeave={(e) => {
                    if (ctx.editable) return
                    e.currentTarget.style.transform = "translateY(0)"
                  }}
                >
                  {featured && (
                    <span
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--brand-primary)",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "5px 12px",
                        borderRadius: 9999,
                        fontFamily: "var(--brand-body-font)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Popular
                    </span>
                  )}
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--brand-foreground)",
                      fontFamily: "var(--brand-heading-font)",
                    }}
                  >
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 40,
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: "var(--brand-foreground)",
                        fontFamily: "var(--brand-heading-font)",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: "#475569",
                        fontFamily: "var(--brand-body-font)",
                      }}
                    >
                      {plan.period}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#475569",
                      fontFamily: "var(--brand-body-font)",
                    }}
                  >
                    {plan.description}
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    {features.map((f, fidx) => (
                      <li
                        key={fidx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 14,
                          color: "var(--brand-foreground)",
                          fontFamily: "var(--brand-body-font)",
                        }}
                      >
                        <Check
                          style={{
                            width: 16,
                            height: 16,
                            color: "var(--brand-primary)",
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={ctx.editable ? undefined : plan.ctaUrl}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 20px",
                      borderRadius: "var(--brand-radius)",
                      fontSize: 15,
                      fontWeight: 600,
                      textDecoration: "none",
                      cursor: ctx.editable ? "default" : "pointer",
                      fontFamily: "var(--brand-body-font)",
                      transition: "opacity 150ms ease",
                      background: featured
                        ? "var(--brand-primary)"
                        : "var(--brand-muted)",
                      color: featured ? "#ffffff" : "var(--brand-foreground)",
                      border: featured
                        ? "1px solid var(--brand-primary)"
                        : "1px solid var(--brand-border)",
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
                    {plan.ctaText}
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  },
  settings: [
    { key: "props.eyebrow", label: "Eyebrow", group: "content", type: "text" },
    { key: "props.heading", label: "Heading", group: "content", type: "text" },
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
      max: 3,
      step: 1,
    },
    {
      key: "props.plans",
      label: "Plans",
      group: "content",
      type: "list",
      itemFields: [
        { key: "name", label: "Plan Name", type: "text" },
        { key: "price", label: "Price (e.g. $29)", type: "text" },
        { key: "period", label: "Period (e.g. /mo)", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "features",
          label: "Features (one per line)",
          type: "textarea",
        },
        { key: "ctaText", label: "CTA Text", type: "text" },
        { key: "ctaUrl", label: "CTA URL", type: "text" },
        {
          key: "featured",
          label: "Featured (true/false)",
          type: "text",
          placeholder: "false",
        },
      ],
    },
    {
      key: "styles.background",
      label: "Background",
      group: "style",
      type: "color",
    },
    { key: "styles.gap", label: "Gap", group: "layout", type: "text" },
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

"use client"

import { Megaphone, ArrowRight } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"
import { InlineText } from "@/components/editor/inline-text"

interface Props {
  heading: string
  subheading: string
  buttonText: string
  buttonUrl: string
}

export const CtaDef: ComponentDefinition<Props> = {
  type: "CTA",
  name: "CTA",
  icon: Megaphone,
  category: "marketing",
  description: "Bold call-to-action band with a single primary button.",
  defaultProps: {
    heading: "Ready to grow your business?",
    subheading:
      "Join thousands of companies already scaling with us.",
    buttonText: "Get Started",
    buttonUrl: "#",
  },
  defaultStyles: {
    background: "var(--brand-primary)",
    textColor: "#ffffff",
    padding: { desktop: "80px", tablet: "56px", mobile: "40px" },
    radius: "var(--radius-xl)",
  },
  render: ({ node, props, styles, ctx }) => {
    const background = (styles.background as string) ?? "var(--brand-primary)"
    const textColor = (styles.textColor as string) ?? "#ffffff"
    const padding = rs(styles.padding, ctx.device, "80px")
    const radius = (styles.radius as string) ?? "var(--radius-xl)"

    return (
      <section
        data-node={node.id}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          paddingLeft: rs(
            { desktop: "24px", tablet: "20px", mobile: "16px" },
            ctx.device,
            "24px"
          ),
          paddingRight: rs(
            { desktop: "24px", tablet: "20px", mobile: "16px" },
            ctx.device,
            "24px"
          ),
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            background,
            color: textColor,
            borderRadius: radius,
            padding,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 20,
            boxShadow: "0 24px 48px -16px rgba(15, 23, 42, 0.18)",
          }}
        >
          <InlineText
            nodeId={node.id}
            propKey="heading"
            value={props.heading}
            as="h2"
            multiline
            style={{
              margin: 0,
              fontSize: ctx.device === "mobile" ? "28px" : "44px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontWeight: 800,
              color: textColor,
              fontFamily: "var(--brand-heading-font)",
              maxWidth: "720px",
              textAlign: "center",
            }}
          />
          <InlineText
            nodeId={node.id}
            propKey="subheading"
            value={props.subheading}
            as="p"
            multiline
            style={{
              margin: 0,
              fontSize: ctx.device === "mobile" ? "16px" : "19px",
              lineHeight: 1.6,
              color: "rgba(255, 255, 255, 0.85)",
              maxWidth: "560px",
              fontFamily: "var(--brand-body-font)",
              textAlign: "center",
            }}
          />
          <a
            href={ctx.editable ? undefined : props.buttonUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              padding: "14px 28px",
              background: "#ffffff",
              color: "var(--brand-primary)",
              borderRadius: "var(--brand-radius)",
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              transition: "transform 150ms ease, box-shadow 150ms ease",
              cursor: ctx.editable ? "default" : "pointer",
              fontFamily: "var(--brand-body-font)",
              boxShadow: "0 8px 16px -8px rgba(15, 23, 42, 0.2)",
            }}
            onClick={(e) => {
              if (ctx.editable) e.preventDefault()
            }}
            onMouseEnter={(e) => {
              if (ctx.editable) return
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow =
                "0 12px 20px -8px rgba(15, 23, 42, 0.25)"
            }}
            onMouseLeave={(e) => {
              if (ctx.editable) return
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow =
                "0 8px 16px -8px rgba(15, 23, 42, 0.2)"
            }}
          >
            <InlineText
              nodeId={node.id}
              propKey="buttonText"
              value={props.buttonText}
              as="span"
              style={{ pointerEvents: "none" }}
            />
            <ArrowRight style={{ width: 16, height: 16, pointerEvents: "none" }} />
          </a>
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
      key: "props.subheading",
      label: "Subheading",
      group: "content",
      type: "textarea",
    },
    {
      key: "props.buttonText",
      label: "Button Text",
      group: "content",
      type: "text",
    },
    {
      key: "props.buttonUrl",
      label: "Button URL",
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
    {
      key: "styles.radius",
      label: "Radius",
      group: "style",
      type: "text",
    },
  ],
}

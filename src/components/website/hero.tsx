"use client"

import { Sparkles, ArrowRight } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"
import { InlineText } from "@/components/editor/inline-text"

type ImagePosition = "left" | "right" | "none"
type Align = "left" | "center"

interface HeroButton {
  text: string
  url: string
}

interface Props {
  eyebrow: string
  headline: string
  subheadline: string
  primaryButton: HeroButton
  secondaryButton: HeroButton
  image: string
  imagePosition: ImagePosition
  align: Align
}

export const HeroDef: ComponentDefinition<Props> = {
  type: "Hero",
  name: "Hero",
  icon: Sparkles,
  category: "marketing",
  description: "Marketing hero with headline, subhead, CTAs and image.",
  defaultProps: {
    eyebrow: "Welcome",
    headline: "Grow Your Business With Smart Marketing",
    subheadline:
      "We help ambitious brands scale with data-driven strategies and beautiful design.",
    primaryButton: { text: "Get Started", url: "#" },
    secondaryButton: { text: "Learn More", url: "#" },
    image: "",
    imagePosition: "right",
    align: "left",
  },
  defaultStyles: {
    background: "var(--brand-background)",
    textColor: "var(--brand-foreground)",
    minHeight: { desktop: "600px", tablet: "520px", mobile: "auto" },
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
  },
  render: ({ node, props, styles, ctx }) => {
    const imagePosition = (props.imagePosition as ImagePosition) ?? "right"
    const align = (props.align as Align) ?? "left"
    const background = (styles.background as string) ?? "var(--brand-background)"
    const textColor = (styles.textColor as string) ?? "var(--brand-foreground)"
    const minHeight = rs(styles.minHeight, ctx.device, "auto")
    const padding = rs(styles.padding, ctx.device, "96px")

    const isMobile = ctx.device === "mobile"
    const isSingleColumn = imagePosition === "none" || isMobile
    const isCentered = align === "center" || imagePosition === "none"

    const primaryBtn = (props.primaryButton as HeroButton) ?? {
      text: "Get Started",
      url: "#",
    }
    const secondaryBtn = (props.secondaryButton as HeroButton) ?? {
      text: "Learn More",
      url: "#",
    }
    const imageSrc = (props.image as string) ?? ""

    const eyebrowEl = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--brand-primary)",
        }}
      >
        <Sparkles style={{ width: 14, height: 14 }} />
        {props.eyebrow}
      </span>
    )

    const headlineEl = (
      <InlineText
        nodeId={node.id}
        propKey="headline"
        value={props.headline}
        as="h1"
        multiline
        style={{
          margin: 0,
          fontSize: isMobile ? "36px" : "56px",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          fontWeight: 800,
          color: textColor,
          fontFamily: "var(--brand-heading-font)",
          textAlign: isCentered ? "center" : "left",
        }}
      />
    )

    const subEl = (
      <InlineText
        nodeId={node.id}
        propKey="subheadline"
        value={props.subheadline}
        as="p"
        multiline
        style={{
          margin: 0,
          fontSize: isMobile ? "16px" : "20px",
          lineHeight: 1.6,
          color: "#475569",
          maxWidth: "560px",
          fontFamily: "var(--brand-body-font)",
          textAlign: isCentered ? "center" : "left",
        }}
      />
    )

    const buttonEl = (btn: HeroButton, primary: boolean) => {
      const baseStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: primary ? "14px 26px" : "14px 22px",
        fontSize: 15,
        fontWeight: 600,
        borderRadius: "var(--brand-radius)",
        textDecoration: "none",
        transition: "all 150ms ease",
        cursor: ctx.editable ? "default" : "pointer",
        fontFamily: "var(--brand-body-font)",
      }
      const variantStyle: React.CSSProperties = primary
        ? {
            background: "var(--brand-primary)",
            color: "#ffffff",
            border: "1px solid var(--brand-primary)",
          }
        : {
            background: "transparent",
            color: textColor,
            border: `1px solid ${textColor === "#ffffff" ? "#ffffff" : "var(--brand-border)"}`,
          }
      return (
        <a
          key={primary ? "primary" : "secondary"}
          href={ctx.editable ? undefined : btn.url}
          style={{ ...baseStyle, ...variantStyle }}
          onClick={(e) => {
            if (ctx.editable) e.preventDefault()
          }}
          onMouseEnter={(e) => {
            if (ctx.editable) return
            if (primary) e.currentTarget.style.opacity = "0.9"
            else
              e.currentTarget.style.background = "var(--brand-muted)"
          }}
          onMouseLeave={(e) => {
            if (ctx.editable) return
            e.currentTarget.style.opacity = "1"
            if (!primary) e.currentTarget.style.background = "transparent"
          }}
        >
          <span style={{ pointerEvents: "none" }}>{btn.text}</span>
          {primary && <ArrowRight style={{ width: 16, height: 16, pointerEvents: "none" }} />}
        </a>
      )
    }

    const textColumn = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          alignItems: isCentered ? "center" : "flex-start",
          justifyContent: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        {eyebrowEl}
        {headlineEl}
        {subEl}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: isCentered ? "center" : "flex-start",
            marginTop: 8,
          }}
        >
          {buttonEl(primaryBtn, true)}
          {buttonEl(secondaryBtn, false)}
        </div>
      </div>
    )

    const imageColumn = imageSrc ? (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={imageSrc}
          alt={props.headline}
          style={{
            maxWidth: "100%",
            width: "100%",
            height: "auto",
            borderRadius: "calc(var(--brand-radius) * 1.5)",
            boxShadow:
              "0 20px 40px -12px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.12)",
            display: "block",
          }}
        />
      </div>
    ) : (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            borderRadius: "calc(var(--brand-radius) * 1.5)",
            background:
              "linear-gradient(135deg, var(--brand-muted) 0%, var(--brand-border) 100%)",
            border: "1px dashed var(--brand-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--brand-foreground)",
            opacity: 0.5,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Hero image
        </div>
      </div>
    )

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
          {imagePosition === "left" && !isSingleColumn ? (
            <>
              {imageColumn}
              {textColumn}
            </>
          ) : imagePosition === "none" ? (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "24px",
                textAlign: "center",
              }}
            >
              {eyebrowEl}
              {headlineEl}
              {subEl}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                {buttonEl(primaryBtn, true)}
                {buttonEl(secondaryBtn, false)}
              </div>
            </div>
          ) : (
            <>
              {textColumn}
              {imageColumn}
            </>
          )}
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
      placeholder: "Welcome",
    },
    {
      key: "props.headline",
      label: "Headline",
      group: "content",
      type: "textarea",
    },
    {
      key: "props.subheadline",
      label: "Subheadline",
      group: "content",
      type: "textarea",
    },
    {
      key: "props.primaryButton.text",
      label: "Primary Button Text",
      group: "content",
      type: "text",
      placeholder: "Get Started",
    },
    {
      key: "props.primaryButton.url",
      label: "Primary Button URL",
      group: "content",
      type: "text",
    },
    {
      key: "props.secondaryButton.text",
      label: "Secondary Button Text",
      group: "content",
      type: "text",
      placeholder: "Learn More",
    },
    {
      key: "props.secondaryButton.url",
      label: "Secondary Button URL",
      group: "content",
      type: "text",
    },
    {
      key: "props.image",
      label: "Image",
      group: "content",
      type: "image",
    },
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

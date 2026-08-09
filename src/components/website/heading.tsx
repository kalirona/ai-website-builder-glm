"use client"

import { Heading as HeadingIcon } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"
import { InlineText } from "@/components/editor/inline-text"

type HeadingLevel = "h1" | "h2" | "h3" | "h4"
type Align = "left" | "center" | "right"

interface Props {
  text: string
  level: HeadingLevel
  align: Align
}

export const HeadingDef: ComponentDefinition<Props> = {
  type: "Heading",
  name: "Heading",
  icon: HeadingIcon,
  category: "content",
  description: "Editable heading (h1–h4) with responsive typography.",
  defaultProps: {
    text: "Build something great",
    level: "h2",
    align: "left",
  },
  defaultStyles: {
    fontSize: { desktop: "40px", tablet: "32px", mobile: "28px" },
    color: "var(--brand-foreground)",
    fontWeight: "700",
    lineHeight: "1.15",
    letterSpacing: "-0.02em",
  },
  render: ({ node, props, styles, ctx }) => {
    const level = (props.level as HeadingLevel) ?? "h2"
    const align = (props.align as Align) ?? "left"
    const fontSize = rs(styles.fontSize, ctx.device, "40px")
    const color = (styles.color as string) ?? "var(--brand-foreground)"
    const fontWeight = (styles.fontWeight as string) ?? "700"
    const lineHeight = (styles.lineHeight as string) ?? "1.15"
    const letterSpacing = (styles.letterSpacing as string) ?? "-0.02em"

    const Tag: React.ElementType = level

    return (
      <InlineText
        nodeId={node.id}
        propKey="text"
        value={props.text}
        as={Tag}
        multiline={false}
        style={{
          fontSize,
          color,
          fontWeight,
          lineHeight,
          letterSpacing,
          textAlign: align,
          margin: 0,
          fontFamily: "var(--brand-heading-font)",
          width: "100%",
          display: "block",
        }}
      />
    )
  },
  settings: [
    {
      key: "props.text",
      label: "Text",
      group: "content",
      type: "text",
      placeholder: "Heading text…",
    },
    {
      key: "props.level",
      label: "Level",
      group: "content",
      type: "select",
      options: [
        { label: "H1", value: "h1" },
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
        { label: "H4", value: "h4" },
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
        { label: "Right", value: "right" },
      ],
    },
    {
      key: "styles.fontSize",
      label: "Font Size",
      group: "typography",
      type: "responsive-text",
      responsive: true,
    },
    {
      key: "styles.color",
      label: "Color",
      group: "typography",
      type: "color",
    },
    {
      key: "styles.fontWeight",
      label: "Font Weight",
      group: "typography",
      type: "select",
      options: [
        { label: "Regular (400)", value: "400" },
        { label: "Medium (500)", value: "500" },
        { label: "Semibold (600)", value: "600" },
        { label: "Bold (700)", value: "700" },
        { label: "Extrabold (800)", value: "800" },
      ],
    },
    {
      key: "styles.lineHeight",
      label: "Line Height",
      group: "typography",
      type: "text",
      placeholder: "1.15",
    },
    {
      key: "styles.letterSpacing",
      label: "Letter Spacing",
      group: "typography",
      type: "text",
      placeholder: "-0.02em",
    },
  ],
}

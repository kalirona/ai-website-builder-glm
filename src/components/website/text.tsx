"use client"

import { Type } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"
import { InlineText } from "@/components/editor/inline-text"

type Align = "left" | "center" | "right"

interface Props {
  text: string
  align: Align
}

export const TextDef: ComponentDefinition<Props> = {
  type: "Text",
  name: "Text",
  icon: Type,
  category: "content",
  description: "Editable paragraph of body copy.",
  defaultProps: {
    text: "Write your paragraph here. Explain your value proposition clearly and concisely.",
    align: "left",
  },
  defaultStyles: {
    fontSize: { desktop: "18px", tablet: "16px", mobile: "16px" },
    color: "#475569",
    lineHeight: "1.7",
  },
  render: ({ node, props, styles, ctx }) => {
    const align = (props.align as Align) ?? "left"
    const fontSize = rs(styles.fontSize, ctx.device, "18px")
    const color = (styles.color as string) ?? "#475569"
    const lineHeight = (styles.lineHeight as string) ?? "1.7"

    return (
      <InlineText
        nodeId={node.id}
        propKey="text"
        value={props.text}
        as="p"
        multiline
        style={{
          fontSize,
          color,
          lineHeight,
          textAlign: align,
          margin: 0,
          fontFamily: "var(--brand-body-font)",
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
      type: "textarea",
      placeholder: "Paragraph body…",
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
      key: "styles.lineHeight",
      label: "Line Height",
      group: "typography",
      type: "text",
      placeholder: "1.7",
    },
  ],
}

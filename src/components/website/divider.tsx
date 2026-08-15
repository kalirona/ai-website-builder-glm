"use client"

import { Minus } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"

interface Props {
  color: string
  thickness: string
  width: string
}

export const DividerDef: ComponentDefinition<Props> = {
  type: "Divider",
  name: "Divider",
  icon: Minus,
  category: "content",
  description: "Horizontal divider line.",
  defaultProps: {
    color: "var(--brand-border)",
    thickness: "1px",
    width: "100%",
  },
  defaultStyles: {
    marginY: "32px",
  },
  render: ({ node, props, styles }) => {
    const color = (props.color as string) ?? "var(--brand-border)"
    const thickness = (props.thickness as string) ?? "1px"
    const width = (props.width as string) ?? "100%"
    const marginY = (styles.marginY as string) ?? "32px"

    return (
      <div
        data-node={node.id}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: marginY,
          marginBottom: marginY,
        }}
      >
        <hr
          style={{
            width,
            border: "none",
            borderTopWidth: thickness,
            borderTopStyle: "solid",
            borderTopColor: color,
            margin: 0,
            display: "block",
          }}
        />
      </div>
    )
  },
  settings: [
    {
      key: "props.color",
      label: "Color",
      group: "style",
      type: "color",
    },
    {
      key: "props.thickness",
      label: "Thickness",
      group: "style",
      type: "text",
      placeholder: "1px",
    },
    {
      key: "props.width",
      label: "Width",
      group: "layout",
      type: "text",
      placeholder: "100%",
    },
    {
      key: "styles.marginY",
      label: "Vertical Margin",
      group: "layout",
      type: "text",
      placeholder: "32px",
    },
  ],
}

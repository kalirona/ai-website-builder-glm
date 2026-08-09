"use client"

import { Square } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

type Props = Record<string, never>

export const ContainerDef: ComponentDefinition<Props> = {
  type: "Container",
  name: "Container",
  icon: Square,
  category: "layout",
  description: "Centered max-width container for constrained content.",
  isCanvas: true,
  allowedChildren: "*",
  defaultProps: {},
  defaultStyles: {
    maxWidth: "1200px",
    padding: { desktop: "48px", tablet: "32px", mobile: "24px" },
  },
  render: ({ node, styles, ctx, children }) => {
    const maxWidth = (styles.maxWidth as string) ?? "1200px"
    const padding = rs(styles.padding, ctx.device, "48px")

    return (
      <div
        data-node={node.id}
        style={{
          maxWidth,
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
          width: "100%",
        }}
      >
        {children}
      </div>
    )
  },
  settings: [
    {
      key: "styles.maxWidth",
      label: "Max Width",
      group: "layout",
      type: "text",
      placeholder: "1200px",
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

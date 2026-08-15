"use client"

import { MoveVertical } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

type Props = Record<string, never>

export const SpacerDef: ComponentDefinition<Props> = {
  type: "Spacer",
  name: "Spacer",
  icon: MoveVertical,
  category: "content",
  description: "Adds vertical space between blocks.",
  defaultProps: {},
  defaultStyles: {
    height: { desktop: "48px", tablet: "32px", mobile: "24px" },
  },
  render: ({ node, styles, ctx }) => {
    const height = rs(styles.height, ctx.device, "48px")
    return (
      <div
        data-node={node.id}
        style={{
          width: "100%",
          height: height === "auto" ? "48px" : height,
          display: "block",
        }}
        aria-hidden
      />
    )
  },
  settings: [
    {
      key: "styles.height",
      label: "Height",
      group: "layout",
      type: "responsive-text",
      responsive: true,
    },
  ],
}

"use client"

import { Columns3 } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

interface Props {
  columns: number
  gap: string
}

export const ColumnsDef: ComponentDefinition<Props> = {
  type: "Columns",
  name: "Columns",
  icon: Columns3,
  category: "layout",
  description: "Responsive column grid (1–4 columns). Stacks on mobile.",
  isCanvas: true,
  allowedChildren: "*",
  defaultProps: {
    columns: 2,
    gap: "24px",
  },
  defaultStyles: {
    padding: { desktop: "48px", tablet: "32px", mobile: "24px" },
  },
  render: ({ node, props, styles, ctx, children }) => {
    const columns = Math.max(1, Math.min(4, Number(props.columns) || 2))
    const gap = (props.gap as string) ?? "24px"
    const padding = rs(styles.padding, ctx.device, "48px")

    // Mobile always stacks to 1 column; tablet caps at 2.
    const resolvedColumns =
      ctx.device === "mobile"
        ? 1
        : ctx.device === "tablet"
          ? Math.min(2, columns)
          : columns

    return (
      <div
        data-node={node.id}
        style={{
          width: "100%",
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {children}
        </div>
      </div>
    )
  },
  settings: [
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
      key: "props.gap",
      label: "Gap",
      group: "layout",
      type: "text",
      placeholder: "24px",
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

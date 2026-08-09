"use client"

import { SquareDashedBottom } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

type Props = Record<string, never>

export const SectionDef: ComponentDefinition<Props> = {
  type: "Section",
  name: "Section",
  icon: SquareDashedBottom,
  category: "layout",
  description: "Full-width section wrapper for grouping page blocks.",
  isCanvas: true,
  allowedChildren: "*",
  defaultProps: {},
  defaultStyles: {
    background: "#ffffff",
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
    maxWidth: "1200px",
    minHeight: "auto",
  },
  render: ({ node, styles, ctx, children }) => {
    const background = (styles.background as string) ?? "#ffffff"
    const padding = rs(styles.padding, ctx.device, "96px")
    const maxWidth = (styles.maxWidth as string) ?? "1200px"
    const minHeight = (styles.minHeight as string) ?? "auto"

    return (
      <section
        data-node={node.id}
        style={{
          background,
          width: "100%",
          minHeight: minHeight === "auto" ? undefined : minHeight,
        }}
      >
        <div
          style={{
            maxWidth,
            margin: "0 auto",
            paddingLeft: padding,
            paddingRight: padding,
            paddingTop: padding,
            paddingBottom: padding,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {children}
        </div>
      </section>
    )
  },
  settings: [
    {
      key: "styles.background",
      label: "Background",
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
      key: "styles.maxWidth",
      label: "Max Width",
      group: "layout",
      type: "text",
      placeholder: "1200px",
    },
    {
      key: "styles.minHeight",
      label: "Min Height",
      group: "layout",
      type: "text",
      placeholder: "auto",
    },
  ],
}

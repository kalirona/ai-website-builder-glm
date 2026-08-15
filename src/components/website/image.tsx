"use client"

import { Image as ImageIcon } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"

type Fit = "cover" | "contain" | "fill"

interface Props {
  src: string
  alt: string
  fit: Fit
}

function objectFitValue(fit: Fit): React.CSSProperties["objectFit"] {
  if (fit === "fill") return "fill"
  if (fit === "contain") return "contain"
  return "cover"
}

export const ImageDef: ComponentDefinition<Props> = {
  type: "Image",
  name: "Image",
  icon: ImageIcon,
  category: "media",
  description: "Responsive image with placeholder fallback.",
  defaultProps: {
    src: "",
    alt: "Image",
    fit: "cover",
  },
  defaultStyles: {
    width: "100%",
    height: "auto",
    radius: "var(--brand-radius)",
  },
  render: ({ node, props, styles }) => {
    const src = (props.src as string) ?? ""
    const alt = (props.alt as string) ?? "Image"
    const fit = (props.fit as Fit) ?? "cover"
    const width = (styles.width as string) ?? "100%"
    const height = (styles.height as string) ?? "auto"
    const radius = (styles.radius as string) ?? "var(--brand-radius)"

    if (!src) {
      return (
        <div
          data-node={node.id}
          style={{
            width,
            height: height === "auto" ? "320px" : height,
            borderRadius: radius,
            background: "var(--brand-muted)",
            border: "1px dashed var(--brand-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "var(--brand-foreground)",
            opacity: 0.55,
          }}
        >
          <ImageIcon style={{ width: 36, height: 36 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Image</span>
        </div>
      )
    }

    return (
      <img
        data-node={node.id}
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width,
          height,
          objectFit: objectFitValue(fit),
          borderRadius: radius,
          display: "block",
          maxWidth: "100%",
          userSelect: "none",
        }}
      />
    )
  },
  settings: [
    {
      key: "props.src",
      label: "Image URL",
      group: "content",
      type: "image",
    },
    {
      key: "props.alt",
      label: "Alt Text",
      group: "content",
      type: "text",
      placeholder: "Describe the image…",
    },
    {
      key: "props.fit",
      label: "Fit",
      group: "style",
      type: "select",
      options: [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
        { label: "Fill", value: "fill" },
      ],
    },
    {
      key: "styles.width",
      label: "Width",
      group: "layout",
      type: "text",
      placeholder: "100%",
    },
    {
      key: "styles.height",
      label: "Height",
      group: "layout",
      type: "text",
      placeholder: "auto",
    },
    {
      key: "styles.radius",
      label: "Radius",
      group: "style",
      type: "text",
      placeholder: "var(--brand-radius)",
    },
  ],
}

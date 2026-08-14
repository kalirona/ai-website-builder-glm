"use client"

import { Video as VideoIcon } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { rs } from "./responsive"

type AspectRatio = "16/9" | "4/3" | "1/1"

interface Props {
  url: string
  aspectRatio: AspectRatio
}

/** Convert any YouTube/Vimeo/embed URL to a usable iframe src. */
function toEmbedSrc(url: string): string {
  if (!url) return ""
  const trimmed = url.trim()
  // YouTube watch?v=ID
  const yt = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo
  const vm = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  // Otherwise assume the URL is already embeddable (e.g. an /embed/ URL or a
  // direct mp4 path the user wants to load in an iframe).
  return trimmed
}

export const VideoDef: ComponentDefinition<Props> = {
  type: "Video",
  name: "Video",
  icon: VideoIcon,
  category: "media",
  description: "Responsive video embed (YouTube, Vimeo or direct iframe URL).",
  defaultProps: {
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    aspectRatio: "16/9",
  },
  defaultStyles: {
    padding: { desktop: "48px", tablet: "32px", mobile: "24px" },
    radius: "var(--brand-radius)",
  },
  render: ({ node, props, styles, ctx }) => {
    const url = (props.url as string) ?? ""
    const aspectRatio = (props.aspectRatio as AspectRatio) ?? "16/9"
    const padding = rs(styles.padding, ctx.device, "48px")
    const radius = (styles.radius as string) ?? "var(--brand-radius)"
    const embedSrc = toEmbedSrc(url)

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
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {embedSrc ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: aspectRatio.replace("/", " / "),
                borderRadius: radius,
                overflow: "hidden",
                background: "#000",
                boxShadow: "0 18px 40px -12px rgba(15, 23, 42, 0.18)",
              }}
            >
              <iframe
                src={embedSrc}
                title="Embedded video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: aspectRatio.replace("/", " / "),
                borderRadius: radius,
                background: "var(--brand-muted)",
                border: "1px dashed var(--brand-border)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "var(--brand-foreground)",
                opacity: 0.6,
              }}
            >
              <VideoIcon style={{ width: 48, height: 48 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Paste a YouTube, Vimeo or embed URL
              </span>
            </div>
          )}
        </div>
      </div>
    )
  },
  settings: [
    {
      key: "props.url",
      label: "Video URL",
      group: "content",
      type: "text",
      placeholder: "https://youtube.com/watch?v=…",
    },
    {
      key: "props.aspectRatio",
      label: "Aspect Ratio",
      group: "layout",
      type: "select",
      options: [
        { label: "16:9", value: "16/9" },
        { label: "4:3", value: "4/3" },
        { label: "1:1", value: "1/1" },
      ],
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
      placeholder: "var(--brand-radius)",
    },
  ],
}

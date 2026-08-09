"use client"

import { useState } from "react"
import { Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react"
import { EditorContextProvider } from "./editor-context"
import { NodeRenderer } from "./node-renderer"
import { tokensToCssVars, deviceWidth } from "@/lib/editor/design-tokens"
import type { EditorData, DesignTokens, Device } from "@/lib/editor/types"
import { cn } from "@/lib/utils"

/**
 * Renders a website from its structured schema — no editor chrome.
 * Used by the preview page (and, eventually, the published site).
 */
export function PreviewRenderer({
  editorData,
  designTokens,
  projectName,
}: {
  editorData: EditorData
  designTokens: DesignTokens
  projectName: string
}) {
  const [device, setDevice] = useState<Device>("desktop")

  const width = deviceWidth(device)

  const devices: { id: Device; icon: typeof Monitor }[] = [
    { id: "desktop", icon: Monitor },
    { id: "tablet", icon: Tablet },
    { id: "mobile", icon: Smartphone },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* Preview toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
        <span className="text-sm font-medium">{projectName} — Preview</span>
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
          {devices.map((d) => {
            const Icon = d.icon
            return (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
                  device === d.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Not yet published
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div
          className="mx-auto shadow-xl"
          style={{
            width: width ? `${width}px` : "100%",
            maxWidth: width ? `${width}px` : "1200px",
            background: designTokens.background,
            ...tokensToCssVars(designTokens),
          }}
        >
          <EditorContextProvider
            value={{
              editable: false,
              device,
              designTokens,
              nodes: editorData.nodes,
              select: () => {},
              updateProps: () => {},
              selectedId: null,
              previewNodeId: null,
            }}
          >
            <NodeRenderer nodeId={editorData.rootId} />
          </EditorContextProvider>
        </div>
      </div>
    </div>
  )
}

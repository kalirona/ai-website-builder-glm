"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { TopBar } from "./top-bar"
import { LeftSidebar } from "./left-sidebar"
import { RightPanel } from "./right-panel"
import { EditorCanvas } from "./canvas"
import { AiAssistant } from "./ai-assistant"
import { useEditorStore } from "@/lib/editor/store"
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts"
import { safeParse } from "@/lib/utils"
import type { EditorData, DesignTokens } from "@/lib/editor/types"
import { defaultDesignTokens } from "@/lib/editor/types"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

// Importing this populates the component registry on the client.
import "@/components/website"

export interface PageSummary {
  slug: string
  name: string
}

export function EditorShell({
  projectId,
  projectName,
  pages,
  initialPageSlug,
  initialEditorData,
  initialTokens,
}: {
  projectId: string
  projectName: string
  pages: PageSummary[]
  initialPageSlug: string
  initialEditorData: EditorData
  initialTokens: DesignTokens
}) {
  const load = useEditorStore((s) => s.load)
  const serialize = useEditorStore((s) => s.serialize)
  const designTokens = useEditorStore((s) => s.designTokens)
  const markSaved = useEditorStore((s) => s.markSaved)
  const dirty = useEditorStore((s) => s.dirty)

  const [currentPageSlug, setCurrentPageSlug] = useState(initialPageSlug)
  const [switching, setSwitching] = useState(false)

  // Load the initial page into the store on mount.
  useEffect(() => {
    load(projectId, initialPageSlug, initialEditorData, initialTokens)
  }, [])

  const doSave = useCallback(async () => {
    try {
      const data = serialize()
      const res = await fetch(`/api/pages/${projectId}?slug=${currentPageSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorData: data }),
      })
      if (!res.ok) throw new Error("save page failed")
      await fetch(`/api/websites/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalStyles: designTokens }),
      })
      markSaved()
      toast.success("Saved")
    } catch {
      toast.error("Save failed")
    }
  }, [projectId, currentPageSlug, serialize, designTokens, markSaved])

  useEditorShortcuts({ onSave: doSave })

  const handleSelectPage = useCallback(
    async (slug: string) => {
      if (slug === currentPageSlug) return
      if (dirty) {
        const ok = confirm("You have unsaved changes. Save before switching pages?")
        if (ok) await doSave()
      }
      setSwitching(true)
      try {
        const res = await fetch(`/api/pages/${projectId}?slug=${slug}`)
        if (!res.ok) throw new Error("load page failed")
        const json = await res.json()
        const data = safeParse<EditorData>(json.editorData, { nodes: {}, rootId: "root" })
        const tokens = safeParse<DesignTokens>(json.designTokens, defaultDesignTokens)
        load(projectId, slug, data, tokens)
        setCurrentPageSlug(slug)
      } catch {
        toast.error("Failed to load page")
      } finally {
        setSwitching(false)
      }
    },
    [projectId, currentPageSlug, dirty, doSave, load]
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar
        projectId={projectId}
        projectName={projectName}
        pageSlug={currentPageSlug}
      />
      <div className="relative min-h-0 flex-1">
        {switching && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={14} maxSize={28} className="hidden sm:block">
            <LeftSidebar
              pages={pages}
              currentPageSlug={currentPageSlug}
              onSelectPage={handleSelectPage}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={58} minSize={30}>
            <EditorCanvas />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={24} minSize={18} maxSize={38}>
            <RightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      {/* AI assistant — mounted once; opens via the toolbar's Ask AI button.
          Opening/closing never touches editor history or dirty state. */}
      <AiAssistant />
    </div>
  )
}

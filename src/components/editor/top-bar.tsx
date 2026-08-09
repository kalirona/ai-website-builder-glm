"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Eye,
  Rocket,
  Loader2,
  LayoutDashboard,
} from "lucide-react"
import { useEditorStore } from "@/lib/editor/store"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Device } from "@/lib/editor/types"

export function TopBar({
  projectId,
  projectName,
  pageSlug,
}: {
  projectId: string
  projectName: string
  pageSlug: string
}) {
  const router = useRouter()
  const device = useEditorStore((s) => s.device)
  const setDevice = useEditorStore((s) => s.setDevice)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const past = useEditorStore((s) => s.past)
  const future = useEditorStore((s) => s.future)
  const dirty = useEditorStore((s) => s.dirty)
  const markSaved = useEditorStore((s) => s.markSaved)
  const serialize = useEditorStore((s) => s.serialize)
  const designTokens = useEditorStore((s) => s.designTokens)

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const devices: { id: Device; icon: typeof Monitor; label: string }[] = [
    { id: "desktop", icon: Monitor, label: "Desktop" },
    { id: "tablet", icon: Tablet, label: "Tablet" },
    { id: "mobile", icon: Smartphone, label: "Mobile" },
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = serialize()
      // save page editor data
      const res = await fetch(`/api/pages/${projectId}?slug=${pageSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorData: data }),
      })
      if (!res.ok) throw new Error("Failed to save page")
      // save design tokens
      await fetch(`/api/websites/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalStyles: designTokens }),
      })
      markSaved()
      toast.success("Saved")
    } catch (e) {
      toast.error("Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await handleSave()
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      })
      if (!res.ok) throw new Error("Failed to publish")
      toast.success("Website published")
      router.refresh()
    } catch (e) {
      toast.error("Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold transition hover:bg-muted"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-xs font-bold">W</span>
          </span>
          <span className="hidden sm:inline">Webcraft</span>
        </Link>

        <div className="h-5 w-px bg-border" />

        <span className="truncate text-sm font-medium" title={projectName}>
          {projectName}
        </span>
        {dirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" />
        )}

        <div className="mx-2 flex items-center gap-0.5">
          <TooltipBtn label="Undo (⌘Z)" disabled={past.length === 0} onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </TooltipBtn>
          <TooltipBtn label="Redo (⇧⌘Z)" disabled={future.length === 0} onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </TooltipBtn>
        </div>

        <div className="mx-auto flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
          {devices.map((d) => {
            const Icon = d.icon
            return (
              <TooltipBtn
                key={d.id}
                label={d.label}
                active={device === d.id}
                onClick={() => setDevice(d.id)}
                variant="device"
              >
                <Icon className="h-4 w-4" />
              </TooltipBtn>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <Link href={`/preview/${projectId}`} target="_blank">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing}
            className="gap-1.5"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            <span className="hidden sm:inline">Publish</span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  )
}

function TooltipBtn({
  label,
  children,
  onClick,
  disabled,
  active,
  variant,
}: {
  label: string
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  variant?: "device"
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md transition",
            variant === "device"
              ? active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              : active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

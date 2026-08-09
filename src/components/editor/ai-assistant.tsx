"use client"

import { useEffect, useState } from "react"
import { Sparkles, Loader2, Wand2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useEditorStore } from "@/lib/editor/store"
import { getComponent } from "@/lib/editor/registry"
import type { SectionEditOutput } from "@/lib/ai/section-schemas"
import { cn } from "@/lib/utils"

/**
 * Lightweight UI-only store for opening the AI assistant for a specific node.
 * Kept separate from the editor store so opening/closing the dialog never
 * touches editor history or dirty state.
 */
let openForNodeId: string | null = null
const listeners = new Set<() => void>()

export function openAiAssistant(nodeId: string) {
  openForNodeId = nodeId
  listeners.forEach((l) => l())
}

function useAssistantOpenState() {
  // subscribe to the module-level open state
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return [openForNodeId, (id: string | null) => {
    openForNodeId = id
    listeners.forEach((l) => l())
  }] as const
}

/** Quick-action suggestions, deterministic per component type. */
function suggestionsFor(type: string): string[] {
  switch (type) {
    case "Hero":
      return [
        "Improve conversion",
        "Rewrite the headline",
        "Make this more premium",
      ]
    case "Features":
      return [
        "Improve the benefits",
        "Make this more concise",
        "Improve clarity",
      ]
    case "CTA":
      return [
        "Improve the CTA",
        "Increase urgency",
        "Make this more persuasive",
      ]
    case "Testimonials":
      return [
        "Make quotes sound more authentic",
        "Improve the heading",
        "Make this more compelling",
      ]
    case "Navbar":
      return [
        "Improve the brand name",
        "Refine the nav labels",
        "Make the CTA stronger",
      ]
    case "Footer":
      return [
        "Improve the description",
        "Refine the link columns",
        "Make this more professional",
      ]
    case "Heading":
    case "Text":
      return ["Rewrite this", "Make it more engaging", "Make it shorter"]
    case "Button":
      return ["Make the label more action-oriented", "Add urgency", "Make it clearer"]
    default:
      return [
        "Improve this section",
        "Make it more engaging",
        "Make it more concise",
      ]
  }
}

export function AiAssistant() {
  const [openNodeId, setOpenNodeId] = useAssistantOpenState()
  const projectId = useEditorStore((s) => s.projectId)
  const nodes = useEditorStore((s) => s.nodes)
  const selectedId = useEditorStore((s) => s.selectedId)

  // Prefer the explicitly-requested node; fall back to the current selection.
  const nodeId = openNodeId ?? selectedId
  const node = nodeId ? nodes[nodeId] : undefined
  const def = node ? getComponent(node.type) : undefined

  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SectionEditOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = !!nodeId && !!node && node.parent !== null

  // Reset transient state whenever the target node changes or dialog closes.
  useEffect(() => {
    setResult(null)
    setError(null)
    // keep the current instruction so the user can tweak + retry, but clear
    // it when the dialog fully closes (nodeId becomes null).
    if (!nodeId) setInstruction("")
  }, [nodeId])

  const handleGenerate = async () => {
    if (!nodeId || !projectId || !node) return
    const trimmed = instruction.trim()
    if (trimmed.length < 3 || loading) return

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/sections/${nodeId}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: trimmed }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : "AI couldn't complete this change."
        setError(msg)
        return
      }
      // The server returns { patch: { mode, node, summary } }, already
      // Zod-validated. Store it temporarily; do NOT apply in this phase.
      setResult(data.patch as SectionEditOutput)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (openState: boolean) => {
    if (!openState) {
      // Closing: discard the temporary patch + reset. No editor changes.
      setOpenNodeId(null)
      setResult(null)
      setError(null)
      setInstruction("")
    }
  }

  const suggestions = node ? suggestionsFor(node.type) : []
  const canGenerate = instruction.trim().length >= 3 && !loading

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Assistant
          </DialogTitle>
          <DialogDescription>
            Editing:{" "}
            <span className="font-medium text-foreground">
              {def?.name ?? node?.type ?? "component"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick actions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => setInstruction(s)}
                  className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-foreground transition hover:bg-muted disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Instruction input */}
          <div className="space-y-1.5">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="What would you like to change?"
              className="min-h-[80px] resize-none text-sm"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canGenerate) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              ⌘/Ctrl + Enter to generate
            </p>
          </div>

          {/* Generate button */}
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI is working…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="font-medium text-destructive">
                  AI couldn&apos;t complete this change.
                </p>
                <p className="text-destructive/80">Your current design is safe.</p>
                {error && error !== "AI couldn't complete this change." && (
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={error}>
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                AI suggestion
              </div>
              <p className="text-sm leading-relaxed">{result.summary}</p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[11px]">
                  {def?.name ?? node?.type} section updated
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  Mode: Merge
                </Badge>
              </div>
              <p className="pt-1 text-[11px] text-muted-foreground">
                Apply will be added next.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The toolbar button that opens the assistant for a given node. */
export function AskAiButton({ nodeId, disabled }: { nodeId: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      title="Ask AI"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        openAiAssistant(nodeId)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none transition",
        "text-amber-300 hover:bg-amber-500/20 disabled:opacity-30"
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Ask AI</span>
    </button>
  )
}

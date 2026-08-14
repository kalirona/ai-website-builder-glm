"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Loader2, Wand2, AlertCircle, Check, X } from "lucide-react"
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
import { toast } from "sonner"
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
  const applySectionPatch = useEditorStore((s) => s.applySectionPatch)
  const select = useEditorStore((s) => s.select)
  const setPreviewPatch = useEditorStore((s) => s.setPreviewPatch)
  const clearPreviewPatch = useEditorStore((s) => s.clearPreviewPatch)

  // The dialog opens ONLY when explicitly requested via the Ask AI button
  // (openNodeId is set). It does NOT auto-open just because a node is selected
  // — otherwise it would pop up on add-section, drag, and every selection
  // change, and could never be closed (closing sets openNodeId=null but
  // selectedId is still set).
  const nodeId = openNodeId
  const node = nodeId ? nodes[nodeId] : undefined
  const def = node ? getComponent(node.type) : undefined

  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<SectionEditOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  // Selection safety: capture which node the AI request was for. If the user
  // changes selection while the request is in flight, we refuse to apply the
  // stale patch to the newly-selected component.
  const requestedNodeIdRef = useRef<string | null>(null)
  const requestedNodeTypeRef = useRef<string | null>(null)

  // Open only when explicitly requested AND the node still exists AND it's not
  // the root (root can't be AI-edited).
  const open = !!openNodeId && !!node && node.parent !== null

  // Reset transient state whenever the target node changes or dialog closes.
  useEffect(() => {
    setResult(null)
    setError(null)
    setApplyError(null)
    // keep the current instruction so the user can tweak + retry, but clear
    // it when the dialog fully closes (nodeId becomes null).
    if (!nodeId) {
      setInstruction("")
      requestedNodeIdRef.current = null
      requestedNodeTypeRef.current = null
    }
  }, [nodeId])

  // Selection safety (Phase 2.8): if the user selects a different component
  // while an AI preview is active, clear the preview so a stale Hero patch
  // can't be seen on / applied to a newly-selected Features component.
  useEffect(() => {
    const requested = requestedNodeIdRef.current
    if (requested && selectedId && selectedId !== requested) {
      clearPreviewPatch()
      setResult(null)
      setApplyError("Selection changed. Generate this change again for the current section.")
    }
  }, [selectedId, clearPreviewPatch])

  const handleGenerate = async () => {
    if (!nodeId || !projectId || !node) return
    const trimmed = instruction.trim()
    if (trimmed.length < 3 || loading) return

    // Capture the node this request is for, so apply can verify it later.
    requestedNodeIdRef.current = nodeId
    requestedNodeTypeRef.current = node.type

    setLoading(true)
    setError(null)
    setApplyError(null)
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
      // Zod-validated. Set the preview so the canvas shows the proposed change
      // (Phase 2.8). The real nodes map is NOT mutated — preview is a virtual
      // overlay. Apply happens only when the user clicks Apply Changes.
      const patch = data.patch as SectionEditOutput
      setResult(patch)
      setPreviewPatch(nodeId, patch)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result || applying) return
    const requestedId = requestedNodeIdRef.current
    const requestedType = requestedNodeTypeRef.current

    // Selection safety: verify the currently-selected node still matches the
    // one the AI generated the patch for. If the user changed selection while
    // the request was running, refuse to apply the stale patch.
    if (!requestedId || !requestedType) {
      setApplyError("Selection changed. Generate this change again for the current section.")
      return
    }
    const current = nodes[requestedId]
    if (!current || current.type !== requestedType) {
      setApplyError("Selection changed. Generate this change again for the current section.")
      return
    }
    // Also verify the patch's node type matches (defense in depth — the store
    // action checks this too, but we want to surface the error here rather
    // than silently failing).
    if (result.node.type !== requestedType) {
      setApplyError("Selection changed. Generate this change again for the current section.")
      return
    }

    setApplying(true)
    setApplyError(null)
    // Clear the virtual preview BEFORE applying the real patch. The existing
    // store action creates exactly ONE history entry on success. It does NOT
    // persist — existing Save handles that.
    clearPreviewPatch()
    const ok = applySectionPatch(requestedId, result)
    setApplying(false)

    if (!ok) {
      // Do NOT close the dialog. No history entry was created.
      setApplyError("These changes could not be applied. Your current design is safe.")
      return
    }

    // Success: keep the edited component selected, clear the temp patch,
    // close the dialog. The store action already preserved selectedId, but
    // we re-select to be explicit.
    select(requestedId)
    toast.success("AI changes applied", {
      description: "Press Undo to revert.",
    })
    setOpenNodeId(null)
    setResult(null)
    setError(null)
    setApplyError(null)
    setInstruction("")
    requestedNodeIdRef.current = null
    requestedNodeTypeRef.current = null
  }

  const handleDiscard = () => {
    // Discard the temporary patch + clear the canvas preview; return to the
    // instruction state so the user can generate again. No editor/history/save
    // changes.
    clearPreviewPatch()
    setResult(null)
    setApplyError(null)
  }

  const handleClose = (openState: boolean) => {
    if (!openState) {
      // Closing: discard the temporary patch + clear preview + reset. No editor
      // changes, no history, no save. Same safe behavior as Discard.
      clearPreviewPatch()
      setOpenNodeId(null)
      setResult(null)
      setError(null)
      setApplyError(null)
      setInstruction("")
      requestedNodeIdRef.current = null
      requestedNodeTypeRef.current = null
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

          {/* Result — AI Preview */}
          {result && (
            <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900 dark:bg-violet-950/20">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                  <Sparkles className="h-3 w-3" />
                  AI Preview
                </div>
                <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
                <p className="text-[11px] text-muted-foreground">
                  Your changes are previewed on the canvas.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="secondary" className="text-[11px]">
                    {def?.name ?? node?.type} section
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    Mode: Merge
                  </Badge>
                </div>
              </div>

              {/* Apply-error (selection changed or store rejection) */}
              {applyError && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-2.5 text-xs dark:bg-amber-950/30">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-amber-800 dark:text-amber-200">{applyError}</p>
                </div>
              )}

              {/* Apply / Discard actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1"
                >
                  {applying ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Apply Changes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDiscard}
                  disabled={applying}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The toolbar button that opens the assistant for a given node. */
export function AskAiButton({ nodeId, disabled }: { nodeId: string; disabled?: boolean }) {
  const select = useEditorStore((s) => s.select)
  return (
    <button
      type="button"
      title="Ask AI"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        // Select the node so the editor context reflects what's being edited,
        // then open the assistant. The assistant opens ONLY because
        // openAiAssistant sets openNodeId — selection alone must NOT open it.
        select(nodeId)
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

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Sparkles,
  Loader2,
  Send,
  Check,
  X,
  AlertCircle,
  RotateCcw,
  Settings2,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor/store"
import { getComponent } from "@/lib/editor/registry"
import type { SectionEditOutput } from "@/lib/ai/section-schemas"
import { toast } from "sonner"
import { genId } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Right-panel tab mode (Properties vs AI Assistant)
// ---------------------------------------------------------------------------

/** "properties" | "ai" — which tab is active on the right side. */
let panelMode: "properties" | "ai" = "properties"
const modeListeners = new Set<() => void>()

function setPanelMode(mode: "properties" | "ai") {
  panelMode = mode
  modeListeners.forEach((l) => l())
}

function usePanelMode() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    modeListeners.add(l)
    return () => {
      modeListeners.delete(l)
    }
  }, [])
  return [panelMode, setPanelMode] as const
}

/**
 * Called by the toolbar's Ask AI button: switches the right panel to the AI
 * tab (no modal). The selected node becomes the chat context.
 */
export function focusAiPanel() {
  setPanelMode("ai")
}

// ---------------------------------------------------------------------------
// Chat message type (client-side only, NOT persisted)
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  action?: {
    nodeId: string
    nodeType: string
    patch?: SectionEditOutput
    status?: "preview" | "applied" | "discarded"
    summary?: string
  }
}

// In-memory message store (module-level so it survives tab switches).
let messages: ChatMessage[] = []
const msgListeners = new Set<() => void>()

function setMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
  messages = updater(messages)
  msgListeners.forEach((l) => l())
}

function useMessages() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    msgListeners.add(l)
    return () => {
      msgListeners.delete(l)
    }
  }, [])
  return messages
}

// ---------------------------------------------------------------------------
// Quick follow-up suggestions
// ---------------------------------------------------------------------------

function followUpsFor(type: string): string[] {
  switch (type) {
    case "Hero":
      return ["Make it shorter", "Try another version", "Improve the CTA"]
    case "Features":
      return ["Make it more concise", "Improve clarity", "Add a benefit"]
    case "CTA":
      return ["Increase urgency", "Make it more persuasive", "Try different copy"]
    default:
      return ["Make it shorter", "Try another version", "Make it more engaging"]
  }
}

// ---------------------------------------------------------------------------
// Chat Panel (the persistent right-side AI interface)
// ---------------------------------------------------------------------------

export function ChatPanel() {
  const messages = useMessages()
  const projectId = useEditorStore((s) => s.projectId)
  const nodes = useEditorStore((s) => s.nodes)
  const selectedId = useEditorStore((s) => s.selectedId)
  const applySectionPatch = useEditorStore((s) => s.applySectionPatch)
  const select = useEditorStore((s) => s.select)
  const setPreviewPatch = useEditorStore((s) => s.setPreviewPatch)
  const clearPreviewPatch = useEditorStore((s) => s.clearPreviewPatch)

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Selection safety: capture which node the AI request was for.
  const requestedNodeIdRef = useRef<string | null>(null)
  const requestedNodeTypeRef = useRef<string | null>(null)

  const selectedNode = selectedId ? nodes[selectedId] : undefined
  const selectedDef = selectedNode ? getComponent(selectedNode.type) : undefined
  const editingLabel = selectedNode
    ? selectedDef?.name ?? selectedNode.type
    : "Whole page"

  // Auto-scroll to newest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  // Focus input when the panel becomes active.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Selection safety: if selection changes while a preview is active, clear it.
  useEffect(() => {
    const requested = requestedNodeIdRef.current
    if (requested && selectedId && selectedId !== requested) {
      clearPreviewPatch()
    }
  }, [selectedId, clearPreviewPatch])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (trimmed.length < 3 || loading) return
    if (!projectId || !selectedId || !selectedNode) return

    const nodeId = selectedId
    const nodeType = selectedNode.type
    requestedNodeIdRef.current = nodeId
    requestedNodeTypeRef.current = nodeType

    // Add the user message.
    const userMsg: ChatMessage = {
      id: genId("msg"),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setError(null)

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
        setError(
          typeof data?.error === "string"
            ? data.error
            : "I couldn't complete that change."
        )
        return
      }
      const patch = data.patch as SectionEditOutput
      // Set the canvas preview (Phase 2.8 — real nodes are NOT mutated).
      setPreviewPatch(nodeId, patch)

      // Add the assistant action card.
      const aiMsg: ChatMessage = {
        id: genId("msg"),
        role: "assistant",
        content: patch.summary,
        timestamp: Date.now(),
        action: {
          nodeId,
          nodeType,
          patch,
          status: "preview",
          summary: patch.summary,
        },
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [input, loading, projectId, selectedId, selectedNode, setPreviewPatch])

  const handleApply = useCallback(
    (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId)
      if (!msg?.action?.patch) return

      const requestedId = msg.action.nodeId
      const requestedType = msg.action.nodeType

      // Selection safety: verify the node still exists + type matches.
      const current = nodes[requestedId]
      if (!current || current.type !== requestedType) {
        toast.error("This AI suggestion was for a section that no longer exists.")
        return
      }
      // If the user has selected a different node, warn but still allow apply
      // to the ORIGINAL node the AI generated the patch for.
      if (selectedId && selectedId !== requestedId) {
        toast("Applying to the original section (not the current selection).", {
          description: `This was generated for ${requestedType}.`,
        })
      }

      clearPreviewPatch()
      const ok = applySectionPatch(requestedId, msg.action.patch)
      if (!ok) {
        toast.error("These changes could not be applied. Your current design is safe.")
        return
      }
      select(requestedId)
      toast.success("AI changes applied", { description: "Press Undo to revert." })

      // Update the message action status.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, action: { ...m.action!, status: "applied" } } : m
        )
      )
    },
    [messages, nodes, selectedId, clearPreviewPatch, applySectionPatch, select]
  )

  const handleDiscard = useCallback(
    (msgId: string) => {
      clearPreviewPatch()
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, action: { ...m.action!, status: "discarded" } } : m
        )
      )
    },
    [clearPreviewPatch]
  )

  const handleRetry = useCallback(() => {
    setError(null)
    handleSend()
  }, [handleSend])

  const canSend = input.trim().length >= 3 && !loading && !!selectedId
  const followUps = selectedNode ? followUpsFor(selectedNode.type) : []

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        {/* Context chip */}
        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[11px] font-medium"
          >
            Editing: {editingLabel}
          </Badge>
        </div>
      </div>

      {/* Messages (scrollable) */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {selectedId
                ? `Ask AI to edit the ${editingLabel}.`
                : "Select a section to ask AI to edit it."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {selectedId
                ? "Describe what you want to change."
                : "Click a component on the canvas first."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onApply={handleApply}
            onDiscard={handleDiscard}
            isCurrentSelection={msg.action?.nodeId === selectedId}
          />
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>AI is thinking…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-destructive">
                  I couldn&apos;t complete that change.
                </p>
                <p className="text-destructive/80">Your current design is safe.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={handleRetry}
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up suggestions */}
      {messages.length > 0 && !loading && !error && selectedId && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-3 pb-2">
          {followUps.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-foreground transition hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedId
                ? "Ask AI to edit this section…"
                : "Select a section first…"
            }
            className="min-h-[60px] max-h-[120px] resize-none pr-12 text-sm"
            disabled={loading || !selectedId}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && canSend) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="absolute bottom-2 right-2 h-7 w-7"
            onClick={handleSend}
            disabled={!canSend}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Enter to send • Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({
  msg,
  onApply,
  onDiscard,
  isCurrentSelection,
}: {
  msg: ChatMessage
  onApply: (id: string) => void
  onDiscard: (id: string) => void
  isCurrentSelection: boolean
}) {
  const isUser = msg.role === "user"

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {msg.content}
        </div>
      </div>
    )
  }

  // Assistant message (possibly with an action card)
  const action = msg.action
  const status = action?.status

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        {/* The AI's summary text */}
        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
          {msg.content}
        </div>

        {/* Action card */}
        {action && action.patch && (
          <div
            className={cn(
              "rounded-lg border p-3 text-xs",
              status === "applied" && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
              status === "discarded" && "border-muted bg-muted/30 opacity-70",
              status === "preview" && "border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20"
            )}
          >
            <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              AI edited: {action.nodeType}
            </div>

            {/* Status badge */}
            {status === "applied" && (
              <div className="mt-2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span className="font-medium">Applied</span>
              </div>
            )}
            {status === "discarded" && (
              <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                <span className="font-medium">Discarded</span>
              </div>
            )}

            {/* Preview + actions */}
            {status === "preview" && (
              <div className="mt-2 space-y-2">
                {!isCurrentSelection && (
                  <p className="text-amber-600 dark:text-amber-400">
                    This AI suggestion was for {action.nodeType}. Select it to apply.
                  </p>
                )}
                <p className="text-muted-foreground">Preview is live on the canvas.</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() => onApply(msg.id)}
                  >
                    <Check className="mr-1.5 h-3 w-3" />
                    Apply Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onDiscard(msg.id)}
                  >
                    <X className="mr-1.5 h-3 w-3" />
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabbed right panel wrapper (Properties vs AI Assistant)
// ---------------------------------------------------------------------------

export function TabbedRightPanel() {
  const [mode, setMode] = usePanelMode()

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b bg-card">
        <button
          type="button"
          onClick={() => setMode("properties")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition",
            mode === "properties"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Properties
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition",
            mode === "ai"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          AI Assistant
        </button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1">
        {mode === "properties" ? <PropertiesPanel /> : <ChatPanel />}
      </div>
    </div>
  )
}

// Lazy wrapper around the existing RightPanel so the tab switch is instant.
import { RightPanel } from "./right-panel"
function PropertiesPanel() {
  return <RightPanel />
}

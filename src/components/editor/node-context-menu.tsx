"use client"

import {
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Clipboard,
  ClipboardPaste,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useEditorStore } from "@/lib/editor/store"
import { useEditorContext } from "./editor-context"
import { focusAiPanel } from "./chat-panel"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * GrapesJS-style right-click context menu for editor nodes. Wraps the node's
 * existing root element (passed as the single child) and intercepts the
 * contextmenu event so:
 *   - right-click selects the node (without deselecting the canvas)
 *   - the menu exposes Duplicate / Delete / Move up / Move down / Ask AI /
 *     Copy / Paste (placeholder) actions
 *
 * The trigger uses `asChild` so it merges its props into the wrapped element
 * (the NodeWrapper's root div) — no extra DOM is inserted and the existing
 * ref / event handlers stay intact.
 */
export function NodeContextMenu({
  nodeId,
  children,
  disabled,
}: {
  nodeId: string
  children: React.ReactElement
  /** Disable for the root node (no delete / duplicate / move). */
  disabled?: boolean
}) {
  const { nodes, select } = useEditorContext()
  const removeNode = useEditorStore((s) => s.removeNode)
  const duplicateNode = useEditorStore((s) => s.duplicateNode)
  const moveNode = useEditorStore((s) => s.moveNode)

  const node = nodes[nodeId]
  const isRoot = node?.parent === null

  // Compute move up / down availability by looking at the parent's children
  // order. Disables the item when the node is already at the boundary.
  const parent = node?.parent ? nodes[node.parent] : undefined
  const siblingIndex = parent ? parent.children.indexOf(nodeId) : -1
  const canMoveUp = !!(parent && siblingIndex > 0)
  const canMoveDown = !!(
    parent &&
    siblingIndex >= 0 &&
    siblingIndex < parent.children.length - 1
  )

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!node?.parent || !parent) return
    if (siblingIndex > 0) moveNode(nodeId, parent.id, siblingIndex - 1)
  }

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!node?.parent || !parent) return
    if (siblingIndex >= 0 && siblingIndex < parent.children.length - 1) {
      moveNode(nodeId, parent.id, siblingIndex + 2)
    }
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateNode(nodeId)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeNode(nodeId)
  }

  const handleAskAi = (e: React.MouseEvent) => {
    e.stopPropagation()
    select(nodeId)
    focusAiPanel()
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    toast.info("Copy / paste is coming soon", {
      description: "Use Duplicate in the meantime.",
    })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        disabled={disabled}
        onContextMenu={(e) => {
          // Stop propagation so the canvas (ancestor) does not also receive
          // the contextmenu event and inadvertently deselect. Selecting on
          // right-click makes the menu feel attached to the right node.
          e.stopPropagation()
          if (!isRoot) select(nodeId)
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={handleDuplicate} disabled={isRoot}>
          <Copy className="h-4 w-4" />
          Duplicate
          <span className="ml-auto text-[10px] text-muted-foreground">⌘D</span>
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={handleDelete}
          disabled={isRoot}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleMoveUp} disabled={!canMoveUp}>
          <ChevronUp className="h-4 w-4" />
          Move up
        </ContextMenuItem>
        <ContextMenuItem onClick={handleMoveDown} disabled={!canMoveDown}>
          <ChevronDown className="h-4 w-4" />
          Move down
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleAskAi}
          disabled={isRoot}
          className={cn(
            "text-amber-600 focus:text-amber-700 dark:text-amber-400"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopy}>
          <Clipboard className="h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem disabled>
          <ClipboardPaste className="h-4 w-4" />
          Paste
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

"use client"

import { useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import {
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Sparkles,
} from "lucide-react"
import { useEditorStore } from "@/lib/editor/store"
import { useEditorContext } from "./editor-context"
import { getComponent } from "@/lib/editor/registry"
import { AskAiButton } from "./ai-assistant"
import { cn } from "@/lib/utils"

/**
 * Drop position: "before" | "after" (insert between siblings) | "inside"
 * (drop into a canvas). Computed from the cursor's vertical position over
 * the node — top third = before, bottom third = after, middle = inside
 * (for canvas nodes only). This mirrors how Craft.js shows drop indicators.
 */
type DropPos = "before" | "after" | "inside"

export function NodeWrapper({
  nodeId,
  isCanvas,
  children,
}: {
  nodeId: string
  isCanvas: boolean
  children: React.ReactNode
}) {
  const { selectedId, select, nodes, previewNodeId } = useEditorContext()
  const removeNode = useEditorStore((s) => s.removeNode)
  const duplicateNode = useEditorStore((s) => s.duplicateNode)
  const moveNode = useEditorStore((s) => s.moveNode)
  const [hovered, setHovered] = useState(false)
  const [dropPos, setDropPos] = useState<DropPos | null>(null)

  const node = nodes[nodeId]
  const def = node ? getComponent(node.type) : undefined
  const isSelected = selectedId === nodeId
  const isRoot = node?.parent === null

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `node:${nodeId}`,
    data: { kind: "node", nodeId },
    disabled: isRoot,
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${nodeId}`,
    data: { nodeId, isCanvas },
    disabled: isRoot,
  })

  const setRef = (el: HTMLElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  // Compute drop position from cursor Y over the node.
  const handleDragOver = (e: React.DragEvent) => {
    if (!isOver) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    if (isCanvas && y > h * 0.3 && y < h * 0.7) {
      setDropPos("inside")
    } else if (y < h * 0.5) {
      setDropPos("before")
    } else {
      setDropPos("after")
    }
  }

  const showOutline = isSelected || hovered || isOver

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    select(nodeId)
  }

  const moveUp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!node?.parent) return
    const parent = nodes[node.parent]
    if (!parent) return
    const idx = parent.children.indexOf(nodeId)
    if (idx > 0) moveNode(nodeId, parent.id, idx - 1)
  }

  const moveDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!node?.parent) return
    const parent = nodes[node.parent]
    if (!parent) return
    const idx = parent.children.indexOf(nodeId)
    if (idx < parent.children.length - 1) moveNode(nodeId, parent.id, idx + 2)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateNode(nodeId)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeNode(nodeId)
  }

  return (
    <div
      ref={setRef}
      onClick={handleSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setDropPos(null)
      }}
      onDragOver={handleDragOver}
      className={cn(
        "relative transition-all duration-100",
        isDragging && "opacity-30",
        showOutline && "outline-2 outline-offset-[-2px]",
        isSelected && "outline-[var(--brand-primary,#6366f1)]",
        !isSelected && hovered && "outline-slate-400",
        !isSelected && isOver && dropPos === "inside" && "outline-emerald-500",
        isRoot && "outline-none"
      )}
      style={
        isSelected
          ? { ["--tw-outline-color" as string]: "var(--brand-primary, #6366f1)" }
          : undefined
      }
    >
      {children}

      {/* Drop indicator lines (before/after) — like Craft.js */}
      {isOver && !isDragging && dropPos === "before" && (
        <div className="pointer-events-none absolute -top-0.5 left-0 right-0 z-20 h-0.5 bg-emerald-500">
          <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
      )}
      {isOver && !isDragging && dropPos === "after" && (
        <div className="pointer-events-none absolute -bottom-0.5 left-0 right-0 z-20 h-0.5 bg-emerald-500">
          <div className="absolute -left-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
      )}

      {/* Drop-inside hint for canvas nodes */}
      {isCanvas && isOver && !isDragging && dropPos === "inside" && (
        <div className="pointer-events-none absolute inset-0 z-10 border-2 border-dashed border-emerald-500/60 bg-emerald-500/5" />
      )}

      {/* Toolbar */}
      {!isRoot && (isSelected || hovered) && def && (
        <div
          className="pointer-events-auto absolute -top-7 left-0 z-30 flex items-center gap-0.5 rounded-md border bg-slate-900 px-1 py-0.5 text-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="cursor-grab px-1 py-0.5 text-slate-300 hover:text-white active:cursor-grabbing"
            title="Drag to move"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="px-1.5 text-[11px] font-medium leading-none">
            {def.name}
          </span>
          <AskAiButton nodeId={nodeId} />
          <div className="mx-0.5 h-3.5 w-px bg-slate-700" />
          <ToolbarBtn onClick={moveUp} title="Move up" disabled={isRoot}>
            <ChevronUp className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={moveDown} title="Move down">
            <ChevronDown className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={handleDuplicate} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={handleDelete} title="Delete" danger>
            <Trash2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>
      )}

      {/* AI Preview indicator (Phase 2.8) */}
      {previewNodeId === nodeId && !isRoot && (
        <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
          <Sparkles className="h-3 w-3" />
          AI Preview
        </div>
      )}
    </div>
  )
}

function ToolbarBtn({
  children,
  onClick,
  title,
  danger,
  disabled,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  title: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1 transition hover:bg-slate-700 disabled:opacity-30",
        danger ? "hover:bg-red-600" : "hover:bg-slate-700"
      )}
    >
      {children}
    </button>
  )
}

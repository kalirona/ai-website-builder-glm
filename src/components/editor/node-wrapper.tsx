"use client"

import { useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import {
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react"
import { useEditorStore } from "@/lib/editor/store"
import { useEditorContext } from "./editor-context"
import { getComponent } from "@/lib/editor/registry"
import { cn } from "@/lib/utils"

/**
 * Wraps a rendered node in the editor. Handles selection outline, hover,
 * the contextual toolbar (drag / move / duplicate / delete), and DnD.
 */
export function NodeWrapper({
  nodeId,
  isCanvas,
  children,
}: {
  nodeId: string
  isCanvas: boolean
  children: React.ReactNode
}) {
  const { selectedId, select, nodes } = useEditorContext()
  const removeNode = useEditorStore((s) => s.removeNode)
  const duplicateNode = useEditorStore((s) => s.duplicateNode)
  const moveNode = useEditorStore((s) => s.moveNode)
  const [hovered, setHovered] = useState(false)

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
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative transition-shadow",
        isDragging && "opacity-40",
        showOutline && "outline-1 outline-offset-[-1px]",
        isSelected && "outline-[var(--brand-primary,#6366f1)]",
        !isSelected && hovered && "outline-slate-300",
        !isSelected && isOver && "outline-emerald-500",
        isRoot && "outline-none"
      )}
      style={isSelected ? { ["--tw-outline-color" as string]: "var(--brand-primary, #6366f1)" } : undefined}
    >
      {children}

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

      {/* Drop hint when over a canvas */}
      {isCanvas && isOver && !isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 border-2 border-dashed border-emerald-500/60 bg-emerald-500/5" />
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

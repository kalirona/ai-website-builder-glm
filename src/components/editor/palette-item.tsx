"use client"

import { useDraggable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import { useEditorStore } from "@/lib/editor/store"
import { getComponent } from "@/lib/editor/registry"
import { cn } from "@/lib/utils"
import { useEditorContext } from "./editor-context"

/** A draggable palette item. Also click-to-add into the selected container. */
export function PaletteItem({ def }: { def: ComponentDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${def.type}`,
    data: { kind: "palette", type: def.type },
  })

  const addNode = useEditorStore((s) => s.addNode)
  const select = useEditorStore((s) => s.select)
  const selectedId = useEditorStore((s) => s.selectedId)
  const nodes = useEditorStore((s) => s.nodes)
  const rootId = useEditorStore((s) => s.rootId)
  const ctx = useEditorContext()

  const handleClick = () => {
    // Add into the selected node if it's a canvas, else into its parent, else root.
    let containerId = rootId
    if (selectedId) {
      const sel = nodes[selectedId]
      if (sel) {
        const selDef = getComponent(sel.type)
        if (selDef?.isCanvas) containerId = selectedId
        else if (sel.parent) containerId = sel.parent
      }
    }
    const newId = addNode(def.type, containerId)
    if (newId) select(newId)
    void ctx
  }

  const Icon = def.icon

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={handleClick}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition hover:border-foreground/30 hover:shadow-sm",
        isDragging && "opacity-40"
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{def.name}</span>
        {def.description && (
          <span className="block truncate text-[11px] text-muted-foreground">
            {def.description}
          </span>
        )}
      </span>
      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
    </button>
  )
}

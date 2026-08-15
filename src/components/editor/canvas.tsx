"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useEditorStore } from "@/lib/editor/store"
import { EditorContextProvider } from "./editor-context"
import { NodeRenderer } from "./node-renderer"
import { RulerBar, RulerCorner } from "./rulers"
import { tokensToCssVars, deviceWidth } from "@/lib/editor/design-tokens"
import { getComponent } from "@/lib/editor/registry"
import { isDescendant, applySectionMerge, type PatchTreeNode } from "@/lib/editor/node-ops"
import { Breadcrumb } from "./breadcrumb"
import { cn } from "@/lib/utils"

/**
 * The editor canvas. Sets up the editor context, design-token CSS vars,
 * the responsive viewport, and the DnD context for moving/adding nodes.
 *
 * Phase 2.8: when an AI preview patch is active, the canvas renders a virtual
 * overlay (computed via the same `applySectionMerge` used by Apply) instead of
 * the real nodes. The real `nodes` in the store are NEVER mutated by preview.
 */
export function EditorCanvas() {
  const nodes = useEditorStore((s) => s.nodes)
  const rootId = useEditorStore((s) => s.rootId)
  const device = useEditorStore((s) => s.device)
  const designTokens = useEditorStore((s) => s.designTokens)
  const selectedId = useEditorStore((s) => s.selectedId)
  const select = useEditorStore((s) => s.select)
  const updateProps = useEditorStore((s) => s.updateProps)
  const addNode = useEditorStore((s) => s.addNode)
  const moveNode = useEditorStore((s) => s.moveNode)
  const hydrated = useEditorStore((s) => s.hydrated)
  const previewPatch = useEditorStore((s) => s.previewPatch)

  const [activeDrag, setActiveDrag] = useState<
    | { kind: "palette"; type: string }
    | { kind: "node"; nodeId: string }
    | null
  >(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // Ref + state for the scrollable canvas area so the rulers can subscribe
  // to its scroll position and stay in sync.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [contentSize, setContentSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  })
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () =>
      setContentSize({
        w: Math.max(el.scrollWidth, el.clientWidth),
        h: Math.max(el.scrollHeight, el.clientHeight),
      })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // also re-measure when nodes change (the inner content can grow/shrink)
    return () => ro.disconnect()
  }, [nodes, device])

  const width = deviceWidth(device)
  const data = { nodes, rootId }

  // Phase 2.8: compute a virtual renderNodes that overlays the AI preview patch.
  // Reuses the SAME applySectionMerge used by Apply — so preview === what Apply
  // produces. The real `nodes` in the store are never mutated.
  const renderNodes = useMemo(() => {
    if (!previewPatch) return nodes
    const patchNode: PatchTreeNode = {
      type: previewPatch.patch.node.type,
      props: previewPatch.patch.node.props,
      styles: previewPatch.patch.node.styles,
      children: previewPatch.patch.node.children ?? [],
    }
    const result = applySectionMerge(
      { nodes, rootId },
      previewPatch.nodeId,
      { node: patchNode }
    )
    return result.ok ? result.nodes : nodes
  }, [nodes, rootId, previewPatch])

  const previewNodeId = previewPatch?.nodeId ?? null

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    if (id.startsWith("palette:")) {
      setActiveDrag({ kind: "palette", type: id.replace("palette:", "") })
    } else if (id.startsWith("node:")) {
      setActiveDrag({ kind: "node", nodeId: id.replace("node:", "") })
    }
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null)
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId || !overId.startsWith("drop:")) return

    const targetNodeId = overId.replace("drop:", "")
    const target = nodes[targetNodeId]
    if (!target) return
    const targetDef = getComponent(target.type)
    const targetIsCanvas = !!targetDef?.isCanvas

    // Compute drop position (before/after/inside) from cursor vs target rect.
    // This mirrors Craft.js's drop indicators.
    const overRect = e.over?.rect
    const activeRect = e.active?.rect.current.translated
    let dropPos: "before" | "after" | "inside" = "after"
    if (overRect && activeRect) {
      const midY = overRect.top + overRect.height / 2
      if (targetIsCanvas && activeRect.top > overRect.top + overRect.height * 0.3 && activeRect.top < overRect.top + overRect.height * 0.7) {
        dropPos = "inside"
      } else if (activeRect.top < midY) {
        dropPos = "before"
      } else {
        dropPos = "after"
      }
    }

    // Palette drag → add a new node
    if (activeId.startsWith("palette:")) {
      const type = activeId.replace("palette:", "")
      if (dropPos === "inside" && targetIsCanvas) {
        addNode(type, targetNodeId)
      } else if (target.parent) {
        const parent = nodes[target.parent]
        const idx = parent.children.indexOf(targetNodeId)
        addNode(type, parent.id, dropPos === "before" ? idx : idx + 1)
      } else if (targetIsCanvas) {
        addNode(type, targetNodeId)
      } else {
        addNode(type, rootId)
      }
      return
    }

    // Existing node drag → move it
    if (activeId.startsWith("node:")) {
      const draggedId = activeId.replace("node:", "")
      if (draggedId === targetNodeId) return
      if (targetNodeId === rootId) {
        moveNode(draggedId, rootId)
        return
      }
      // can't move into own descendant
      if (isDescendant(data, targetNodeId, draggedId)) return

      if (dropPos === "inside" && targetIsCanvas) {
        moveNode(draggedId, targetNodeId)
      } else if (target.parent) {
        const parent = nodes[target.parent]
        let idx = parent.children.indexOf(targetNodeId)
        if (dropPos === "after") idx += 1
        // if dragging within same parent and currently before target,
        // removal shifts target left, so decrease by 1
        if (parent.id === nodes[draggedId]?.parent) {
          const curIdx = parent.children.indexOf(draggedId)
          if (curIdx < idx) idx -= 1
        }
        moveNode(draggedId, parent.id, idx)
      }
    }
  }

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading canvas…
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <EditorContextProvider
        value={{
          editable: true,
          device,
          designTokens,
          nodes: renderNodes,
          select,
          updateProps,
          selectedId,
          previewNodeId,
        }}
      >
        <div
          className="flex h-full w-full flex-col overflow-hidden bg-slate-100"
          style={{
            backgroundImage:
              "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onClick={() => select(null)}
        >
          {/* Breadcrumb bar (Phase 2.8) */}
          <div className="shrink-0 border-b bg-card px-4 py-1.5" onClick={(e) => e.stopPropagation()}>
            <Breadcrumb />
          </div>
          {/* Canvas area with rulers (Feature 5).
              Layout: corner | horizontal ruler on top row, vertical ruler |
              scrollable content on bottom row. Rulers stay pinned (siblings
              of the scroll area) while their inner tick tracks translate to
              reflect the current scroll position. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0">
              <RulerCorner />
              <RulerBar
                scrollRef={scrollRef}
                orientation="horizontal"
                contentLength={contentSize.w}
                className="flex-1"
              />
            </div>
            <div className="flex min-h-0 flex-1">
              <RulerBar
                scrollRef={scrollRef}
                orientation="vertical"
                contentLength={contentSize.h}
              />
              <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
                <div
                  className={cn(
                    "mx-auto shadow-xl transition-all duration-200",
                    width ? "rounded-xl" : "rounded-xl w-full max-w-[1280px]"
                  )}
                  style={{
                    width: width ? `${width}px` : "100%",
                    maxWidth: width ? `${width}px` : "1280px",
                    background: designTokens.background,
                    ...tokensToCssVars(designTokens),
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <NodeRenderer nodeId={rootId} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </EditorContextProvider>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="rounded-md border bg-white px-3 py-2 text-xs font-medium shadow-lg">
            {activeDrag.kind === "palette"
              ? `Add ${activeDrag.type}`
              : `Move ${getComponent(nodes[activeDrag.nodeId]?.type ?? "")?.name ?? "component"}`}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

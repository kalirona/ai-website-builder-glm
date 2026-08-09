"use client"

import { useEditorContext } from "./editor-context"
import { getComponent } from "@/lib/editor/registry"
import { NodeWrapper } from "./node-wrapper"
import type { RenderContext } from "@/lib/editor/types"

/**
 * The single node renderer. Walks the node tree from `nodeId`, looks up the
 * component definition, calls its `render`, and (in editor mode) wraps the
 * output in a NodeWrapper for selection / DnD / inline editing.
 *
 * Used by the editor canvas AND the preview page — guarantees WYSIWYG.
 */
export function NodeRenderer({ nodeId }: { nodeId: string }) {
  const ctx = useEditorContext()
  const node = ctx.nodes[nodeId]

  if (!node) {
    if (!ctx.editable) return null
    return (
      <div className="p-4 text-xs text-muted-foreground border border-dashed rounded">
        Missing node: {nodeId}
      </div>
    )
  }

  const def = getComponent(node.type)

  // The page root (parent === null) is a bare full-width container that stacks
  // its children. Its own `type` is ignored so the page sections render cleanly.
  if (node.parent === null) {
    const children =
      node.children.length === 0
        ? ctx.editable
          ? <EmptyCanvasHint nodeId={nodeId} />
          : null
        : node.children.map((cid) => <NodeRenderer key={cid} nodeId={cid} />)
    return <div style={{ width: "100%" }}>{children}</div>
  }

  if (!def) {
    if (!ctx.editable) return null
    return (
      <div className="p-4 text-xs text-destructive border border-dashed rounded">
        Unknown component: {node.type}
      </div>
    )
  }

  // Render children recursively if this component is a canvas.
  const children = def.isCanvas
    ? node.children.length === 0
      ? ctx.editable
        ? <EmptyCanvasHint nodeId={nodeId} />
        : null
      : node.children.map((cid) => <NodeRenderer key={cid} nodeId={cid} />)
    : null

  const renderCtx: RenderContext = {
    device: ctx.device,
    designTokens: ctx.designTokens,
    editable: ctx.editable,
  }

  const rendered = def.render({
    node,
    props: node.props,
    styles: node.styles,
    ctx: renderCtx,
    children,
  })

  if (!ctx.editable) return <>{rendered}</>

  return (
    <NodeWrapper nodeId={nodeId} isCanvas={!!def.isCanvas}>
      {rendered}
    </NodeWrapper>
  )
}

function EmptyCanvasHint({ nodeId }: { nodeId: string }) {
  const { select } = useEditorContext()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        select(nodeId)
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 py-12 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
    >
      Drop components here or pick from the left panel
    </button>
  )
}

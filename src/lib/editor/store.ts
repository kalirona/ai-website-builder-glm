"use client"

import { create } from "zustand"
import type { EditorData, Node, Device, DesignTokens } from "./types"
import { defaultDesignTokens } from "./types"
import type { SectionEditOutput } from "@/lib/ai/section-schemas"
import {
  cloneEditorData,
  makeNode,
  addNode,
  removeNode,
  moveNode,
  duplicateNode,
  applySectionMerge,
  type PatchTreeNode,
} from "./node-ops"
// Re-exported for client convenience. Server code should import from
// "@/lib/editor/node-ops" directly (this module is "use client").
export { createBlankEditorData } from "./node-ops"
import { getComponent } from "./registry"

const HISTORY_LIMIT = 50

interface EditorStoreState {
  // document
  nodes: Record<string, Node>
  rootId: string
  // editor ui
  selectedId: string | null
  device: Device
  designTokens: DesignTokens
  dirty: boolean
  pageSlug: string
  projectId: string | null
  // history
  past: EditorData[]
  future: EditorData[]
  // AI preview (Phase 2.8) — temporary, NEVER creates history or dirty state.
  // When set, the canvas renders a virtual overlay of this patch on the node.
  previewPatch: { nodeId: string; patch: SectionEditOutput } | null
  // meta
  hydrated: boolean

  // actions
  load: (projectId: string, slug: string, data: EditorData, tokens: DesignTokens) => void
  serialize: () => EditorData
  setDevice: (d: Device) => void
  setDesignTokens: (tokens: DesignTokens) => void
  select: (id: string | null) => void

  addNode: (type: string, parentId: string, index?: number) => string | null
  insertNode: (type: string, parentId: string, index?: number) => string | null
  removeNode: (id: string) => void
  moveNode: (id: string, newParentId: string, index?: number) => void
  duplicateNode: (id: string) => void
  updateProps: (id: string, patch: Record<string, unknown>) => void
  updateStyles: (id: string, patch: Record<string, unknown>) => void
  /**
   * Live (debounced) variants of updateProps/updateStyles for text inputs.
   * These update `nodes` immediately so the canvas reflects changes as the
   * user types, mark dirty=true and clear `future`, but do NOT push a
   * snapshot to `past`. The caller must invoke `commitHistory()` after the
   * burst of edits (e.g. on blur or after a 400ms debounce) to create a
   * single undo entry for the whole burst.
   *
   * Without this, typing 50 characters floods the undo stack with 50
   * snapshots and makes the canvas laggy (deep clone on every keystroke).
   */
  updatePropsLive: (id: string, patch: Record<string, unknown>) => void
  updateStylesLive: (id: string, patch: Record<string, unknown>) => void
  /**
   * Push the current nodes/rootId state into `past` (capped at HISTORY_LIMIT).
   * Use after a burst of `updatePropsLive` / `updateStylesLive` calls to
   * create a single undo entry for the burst. No-op if there are no nodes.
   */
  commitHistory: () => void
  /**
   * Apply a validated AI section patch to a node (merge mode). Creates
   * exactly ONE undo history entry. Preserves the node's id + parent.
   * Returns true on success, false if rejected (root / type mismatch /
   * malformed patch). Never persists. (Phase 2.5)
   */
  applySectionPatch: (nodeId: string, patch: SectionEditOutput) => boolean
  /** Set a temporary AI preview patch. Does NOT modify nodes/history/dirty. */
  setPreviewPatch: (nodeId: string, patch: SectionEditOutput) => void
  /** Clear the temporary AI preview. Does NOT modify nodes/history/dirty. */
  clearPreviewPatch: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  markSaved: () => void
}

function snapshot(state: { nodes: Record<string, Node>; rootId: string }): EditorData {
  return cloneEditorData({ nodes: state.nodes, rootId: state.rootId })
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  nodes: {},
  rootId: "root",
  selectedId: null,
  device: "desktop",
  designTokens: defaultDesignTokens,
  dirty: false,
  pageSlug: "home",
  projectId: null,
  past: [],
  future: [],
  previewPatch: null,
  hydrated: false,

  load: (projectId, slug, data, tokens) => {
    set({
      projectId,
      pageSlug: slug,
      nodes: data.nodes,
      rootId: data.rootId,
      designTokens: tokens,
      selectedId: null,
      past: [],
      future: [],
      previewPatch: null,
      dirty: false,
      hydrated: true,
    })
  },

  serialize: () => {
    const { nodes, rootId } = get()
    return { nodes, rootId }
  },

  setDevice: (d) => set({ device: d }),

  setDesignTokens: (tokens) => {
    const { past, nodes, rootId } = get()
    set({
      past: [...past, snapshot({ nodes, rootId })].slice(-HISTORY_LIMIT),
      designTokens: tokens,
      dirty: true,
      future: [],
    })
  },

  select: (id) => set({ selectedId: id }),

  addNode: (type, parentId, index) => {
    const def = getComponent(type)
    if (!def) return null
    const state = get()
    const data: EditorData = { nodes: state.nodes, rootId: state.rootId }
    const node = makeNode(type, { props: def.defaultProps, styles: def.defaultStyles }, parentId)
    const { nodes, id } = addNode(data, node, parentId, index)

    // Auto-create default children for canvas components (e.g. Hero comes with
    // Heading, Text, Button, Image so each element is independently selectable).
    let finalNodes = nodes
    if (def.defaultChildren && def.defaultChildren.length > 0) {
      const childData: EditorData = { nodes: finalNodes, rootId: state.rootId }
      for (const childDef of def.defaultChildren) {
        const childRegDef = getComponent(childDef.type)
        if (!childRegDef) continue
        const childNode = makeNode(childDef.type, {
          props: { ...childRegDef.defaultProps, ...(childDef.props ?? {}) },
          styles: { ...childRegDef.defaultStyles, ...(childDef.styles ?? {}) },
        }, id)
        const res = addNode(childData, childNode, id)
        childData.nodes = res.nodes
      }
      finalNodes = childData.nodes
    }

    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes: finalNodes,
      selectedId: id,
      dirty: true,
      future: [],
    })
    return id
  },

  // alias for clarity in the UI
  insertNode: (type, parentId, index) => get().addNode(type, parentId, index),

  removeNode: (id) => {
    const state = get()
    if (id === state.rootId) return
    const data: EditorData = { nodes: state.nodes, rootId: state.rootId }
    const nodes = removeNode(data, id)
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes,
      selectedId: state.selectedId === id ? null : state.selectedId,
      dirty: true,
      future: [],
    })
  },

  moveNode: (id, newParentId, index) => {
    const state = get()
    const data: EditorData = { nodes: state.nodes, rootId: state.rootId }
    const nodes = moveNode(data, id, newParentId, index)
    if (nodes === state.nodes) return
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes,
      dirty: true,
      future: [],
    })
  },

  duplicateNode: (id) => {
    const state = get()
    const data: EditorData = { nodes: state.nodes, rootId: state.rootId }
    const { nodes, newId } = duplicateNode(data, id)
    if (!newId) return
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes,
      selectedId: newId,
      dirty: true,
      future: [],
    })
  },

  updateProps: (id, patch) => {
    const state = get()
    const existing = state.nodes[id]
    if (!existing) return
    const node: Node = {
      ...existing,
      props: { ...existing.props, ...patch },
      children: [...existing.children],
    }
    const nodes = { ...state.nodes, [id]: node }
    // lightweight history: snapshot before first edit in a burst? We snapshot every change for simplicity.
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes,
      dirty: true,
      future: [],
    })
  },

  updateStyles: (id, patch) => {
    const state = get()
    const existing = state.nodes[id]
    if (!existing) return
    const node: Node = {
      ...existing,
      styles: { ...existing.styles, ...patch },
      children: [...existing.children],
    }
    const nodes = { ...state.nodes, [id]: node }
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes,
      dirty: true,
      future: [],
    })
  },

  // Live (debounced) variants — update nodes immediately so the canvas
  // reflects the change as the user types, but DON'T push to past. The
  // caller commits a single history entry via commitHistory() after the
  // burst (e.g. on blur or after a 400ms debounce).
  updatePropsLive: (id, patch) => {
    const state = get()
    const existing = state.nodes[id]
    if (!existing) return
    const node: Node = {
      ...existing,
      props: { ...existing.props, ...patch },
      children: [...existing.children],
    }
    const nodes = { ...state.nodes, [id]: node }
    set({ nodes, dirty: true, future: [] })
  },

  updateStylesLive: (id, patch) => {
    const state = get()
    const existing = state.nodes[id]
    if (!existing) return
    const node: Node = {
      ...existing,
      styles: { ...existing.styles, ...patch },
      children: [...existing.children],
    }
    const nodes = { ...state.nodes, [id]: node }
    set({ nodes, dirty: true, future: [] })
  },

  commitHistory: () => {
    const state = get()
    if (Object.keys(state.nodes).length === 0) return
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      future: [],
    })
  },

  applySectionPatch: (nodeId, patch) => {
    const state = get()
    // Root protection + existence — handled inside applySectionMerge too,
    // but we short-circuit here for clarity and to avoid snapshotting on a
    // doomed operation.
    if (nodeId === state.rootId) return false
    const existing = state.nodes[nodeId]
    if (!existing) return false
    if (existing.parent === null) return false

    // Component type protection + merge + id generation + cycle check.
    const data: EditorData = { nodes: state.nodes, rootId: state.rootId }
    const patchNode: PatchTreeNode = {
      type: patch.node.type,
      props: patch.node.props,
      styles: patch.node.styles,
      children: patch.node.children ?? [],
    }
    const result = applySectionMerge(data, nodeId, { node: patchNode })
    if (!result.ok) return false

    // ONE history entry: snapshot the pre-patch state, clear future, apply.
    set({
      past: [...state.past, snapshot({ nodes: state.nodes, rootId: state.rootId })].slice(-HISTORY_LIMIT),
      nodes: result.nodes,
      // selection stays on the same node (its id is preserved)
      selectedId: nodeId,
      dirty: true,
      future: [],
    })
    return true
  },

  setPreviewPatch: (nodeId, patch) => {
    // Temporary preview — NO history, NO dirty, NO node mutation.
    set({ previewPatch: { nodeId, patch } })
  },

  clearPreviewPatch: () => {
    set({ previewPatch: null })
  },

  undo: () => {
    const state = get()
    if (state.past.length === 0) return
    const previous = state.past[state.past.length - 1]
    const past = state.past.slice(0, -1)
    const current: EditorData = { nodes: state.nodes, rootId: state.rootId }
    // Validate selection against the restored nodes — if the selected node
    // no longer exists (e.g. it was created by the now-undone action), clear
    // it so we never carry a dangling selectedId.
    const restoredSelected =
      state.selectedId && previous.nodes[state.selectedId]
        ? state.selectedId
        : null
    set({
      nodes: previous.nodes,
      rootId: previous.rootId,
      selectedId: restoredSelected,
      past,
      future: [current, ...state.future].slice(0, HISTORY_LIMIT),
      dirty: true,
    })
  },

  redo: () => {
    const state = get()
    if (state.future.length === 0) return
    const next = state.future[0]
    const future = state.future.slice(1)
    const current: EditorData = { nodes: state.nodes, rootId: state.rootId }
    // Same validation as undo: the redone state may not contain the selected node.
    const restoredSelected =
      state.selectedId && next.nodes[state.selectedId]
        ? state.selectedId
        : null
    set({
      nodes: next.nodes,
      rootId: next.rootId,
      selectedId: restoredSelected,
      past: [...state.past, current].slice(-HISTORY_LIMIT),
      future,
      dirty: true,
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  markSaved: () => set({ dirty: false }),
}))

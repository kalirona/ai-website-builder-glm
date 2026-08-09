import type { Node, EditorData } from "./types"
import { genId } from "@/lib/utils"

/** Create a blank editor document with an empty root node. (Server-safe.) */
export function createBlankEditorData(): EditorData {
  const rootId = "root"
  const root: Node = {
    id: rootId,
    type: "Root",
    props: {},
    styles: {},
    children: [],
    parent: null,
  }
  return { nodes: { [rootId]: root }, rootId }
}

/** Deep clone of editor data (history snapshots). */
export function cloneEditorData(data: EditorData): EditorData {
  return {
    rootId: data.rootId,
    nodes: Object.fromEntries(
      Object.entries(data.nodes).map(([id, n]) => [
        id,
        { ...n, props: { ...n.props }, styles: { ...n.styles }, children: [...n.children] },
      ])
    ),
  }
}

/** Get the default props/styles for a new node of a given type. */
export function makeNode(
  type: string,
  defaults: { props: Record<string, unknown>; styles: Record<string, unknown> },
  parent: string | null
): Node {
  return {
    id: genId(type.toLowerCase()),
    type,
    props: structuredClone(defaults.props),
    styles: structuredClone(defaults.styles),
    children: [],
    parent,
  }
}

/** Add a node as a child of parentId at index (default append). Returns new nodes map + id. */
export function addNode(
  data: EditorData,
  node: Node,
  parentId: string,
  index?: number
): { nodes: EditorData["nodes"]; id: string } {
  const nodes = { ...data.nodes }
  const parent = { ...nodes[parentId] }
  node.parent = parentId
  if (index === undefined || index < 0 || index > parent.children.length) {
    parent.children = [...parent.children, node.id]
  } else {
    parent.children = [...parent.children.slice(0, index), node.id, ...parent.children.slice(index)]
  }
  nodes[parentId] = parent
  nodes[node.id] = node
  return { nodes, id: node.id }
}

/** Remove a node and all its descendants. Returns new nodes map. */
export function removeNode(
  data: EditorData,
  id: string
): EditorData["nodes"] {
  if (id === data.rootId) return data.nodes // cannot remove root
  const nodes = { ...data.nodes }
  const target = nodes[id]
  if (!target) return nodes
  // collect descendants
  const toRemove = new Set<string>([id])
  const stack = [...target.children]
  while (stack.length) {
    const cid = stack.pop()!
    const child = nodes[cid]
    if (!child) continue
    toRemove.add(cid)
    stack.push(...child.children)
  }
  // detach from parent
  if (target.parent && nodes[target.parent]) {
    const parent = { ...nodes[target.parent] }
    parent.children = parent.children.filter((c) => c !== id)
    nodes[target.parent] = parent
  }
  for (const rid of toRemove) delete nodes[rid]
  return nodes
}

/** Move a node to a new parent at index. Prevents moving into own descendant. */
export function moveNode(
  data: EditorData,
  id: string,
  newParentId: string,
  index?: number
): EditorData["nodes"] {
  if (id === data.rootId) return data.nodes
  if (id === newParentId) return data.nodes
  // prevent moving into descendant
  if (isDescendant(data, newParentId, id)) return data.nodes
  const nodes = { ...data.nodes }
  const node = { ...nodes[id] }
  const oldParent = node.parent ? { ...nodes[node.parent] } : null
  const newParent = { ...nodes[newParentId] }
  // remove from old parent
  if (oldParent) {
    oldParent.children = oldParent.children.filter((c) => c !== id)
    nodes[oldParent.id] = oldParent
  }
  node.parent = newParentId
  nodes[id] = node
  // insert into new parent
  if (index === undefined || index < 0 || index > newParent.children.length) {
    newParent.children = [...newParent.children, id]
  } else {
    newParent.children = [...newParent.children.slice(0, index), id, ...newParent.children.slice(index)]
  }
  nodes[newParentId] = newParent
  return nodes
}

/** Duplicate a node and its subtree. Returns new nodes map + new root id. */
export function duplicateNode(
  data: EditorData,
  id: string
): { nodes: EditorData["nodes"]; newId: string | null } {
  if (id === data.rootId) return { nodes: data.nodes, newId: null }
  const nodes = { ...data.nodes }
  const original = nodes[id]
  if (!original || !original.parent) return { nodes: data.nodes, newId: null }

  const idMap = new Map<string, string>()
  function cloneSubtree(nodeId: string, parentId: string): string {
    const src = nodes[nodeId]
    const newId = genId(src.type.toLowerCase())
    idMap.set(nodeId, newId)
    const clone: Node = {
      id: newId,
      type: src.type,
      props: structuredClone(src.props),
      styles: structuredClone(src.styles),
      children: [],
      parent: parentId,
    }
    nodes[newId] = clone
    clone.children = src.children.map((c) => cloneSubtree(c, newId))
    return newId
  }
  const newId = cloneSubtree(id, original.parent)
  // insert duplicate next to original in parent
  const parent = { ...nodes[original.parent] }
  const idx = parent.children.indexOf(id)
  parent.children = [
    ...parent.children.slice(0, idx + 1),
    newId,
    ...parent.children.slice(idx + 1),
  ]
  nodes[parent.id] = parent
  return { nodes, newId }
}

/** Is `maybeDescendant` a descendant of `ancestor`? */
export function isDescendant(data: EditorData, maybeDescendant: string, ancestor: string): boolean {
  if (maybeDescendant === ancestor) return true
  const anc = data.nodes[ancestor]
  if (!anc) return false
  const stack = [...anc.children]
  while (stack.length) {
    const cid = stack.pop()!
    if (cid === maybeDescendant) return true
    const c = data.nodes[cid]
    if (c) stack.push(...c.children)
  }
  return false
}

/** Get a flat ordered list of all node ids (depth-first from root). */
export function flatten(data: EditorData): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    out.push(id)
    const n = data.nodes[id]
    if (n) n.children.forEach(walk)
  }
  walk(data.rootId)
  return out
}

/** Validate that an EditorData has a root and all referenced nodes exist. */
export function validateEditorData(data: unknown): data is EditorData {
  if (!data || typeof data !== "object") return false
  const d = data as EditorData
  if (typeof d.rootId !== "string") return false
  if (!d.nodes || typeof d.nodes !== "object") return false
  if (!d.nodes[d.rootId]) return false
  return true
}

// ---------------------------------------------------------------------------
// AI section-edit patch application (Phase 2.5)
// ---------------------------------------------------------------------------

/**
 * The nested tree shape produced by the AI (no editor ids). Mirrors
 * `AiTreeNode` from `@/lib/ai/provider` but duplicated here as a structural
 * type so `node-ops.ts` stays free of any AI-module dependency (server-safe,
 * importable from anywhere).
 */
export interface PatchTreeNode {
  type: string
  props: Record<string, unknown>
  styles?: Record<string, unknown>
  children: PatchTreeNode[]
}

/** Result of attempting to apply a section patch. */
export type ApplySectionResult =
  | { ok: true; nodes: Record<string, Node> }
  | { ok: false; reason: string }

/**
 * Apply an AI section patch (merge mode) to a single node, returning the new
 * nodes map or a rejection reason. PURE function — does not mutate `data`.
 *
 * Contract:
 *  - The selected node's `id` and `parent` are preserved.
 *  - `props`: shallow-merged (only keys present in the patch overwrite; all
 *    existing keys not in the patch survive).
 *  - `styles`: shallow-merged the same way.
 *  - `children`: if the patch provides a non-empty `children` array, the
 *    existing children are REPLACED by newly-id'd descendants built from the
 *    nested patch tree. If the patch provides an empty `children` array, the
 *    existing children are removed. If the patch omits `children` entirely
 *    (undefined), existing children are PRESERVED.
 *  - New descendant ids are generated via `genId(type)` — the AI never
 *    supplies ids. Duplicate-id and cycle checks are performed.
 *
 * Defensive rejections (returns `{ ok: false }`):
 *  - nodeId is the root
 *  - node missing / no parent
 *  - patch missing or patch.node missing
 *  - patch.node.type !== existing node.type (component type protection)
 *  - the patch subtree contains an explicit `id` or `parent` field (the AI
 *    must never set these)
 *  - duplicate ids would result (should be impossible since we generate all
 *    descendant ids, but checked defensively)
 *  - a cycle would be introduced (parent chain reaches nodeId)
 */
export function applySectionMerge(
  data: EditorData,
  nodeId: string,
  patch: { node: PatchTreeNode }
): ApplySectionResult {
  // ---- root + existence checks ----
  if (nodeId === data.rootId) {
    return { ok: false, reason: "Cannot apply a section patch to the root node." }
  }
  const existing = data.nodes[nodeId]
  if (!existing) {
    return { ok: false, reason: "Target node does not exist." }
  }
  if (existing.parent === null) {
    return { ok: false, reason: "Cannot apply a section patch to the root node." }
  }

  // ---- patch shape check ----
  if (!patch || !patch.node || typeof patch.node !== "object") {
    return { ok: false, reason: "Patch is missing a node." }
  }
  const patchNode = patch.node

  // ---- component type protection ----
  if (patchNode.type !== existing.type) {
    return {
      ok: false,
      reason: `Component type mismatch: patch is "${patchNode.type}" but node is "${existing.type}".`,
    }
  }

  // ---- reject AI-supplied editor-internal fields anywhere in subtree ----
  if (containsEditorFields(patchNode)) {
    return {
      ok: false,
      reason: "Patch contains editor-internal fields (id/parent). These are assigned by the editor.",
    }
  }

  // ---- build the new nodes map ----
  // Start from a shallow copy of the existing map. We will replace the
  // targeted node and (if children change) swap in fresh descendant nodes
  // while removing the old descendants of `nodeId`.
  const nodes: Record<string, Node> = { ...data.nodes }

  // Merge props + styles onto the existing node (shallow merge).
  const mergedProps: Record<string, unknown> = {
    ...existing.props,
    ...patchNode.props,
  }
  const mergedStyles: Record<string, unknown> = {
    ...existing.styles,
    ...(patchNode.styles ?? {}),
  }

  // Resolve children:
  //  - patch omits `children` (undefined)  => PRESERVE existing children
  //    (and their subtrees) untouched.
  //  - patch provides a `children` array    => REPLACE: remove old
  //    descendants from the map, then build fresh id'd descendants from the
  //    nested patch tree.
  let childrenIds: string[]
  const patchHasChildren = Array.isArray(patchNode.children)
  if (!patchHasChildren) {
    // Preserve existing children — their node entries are still in `nodes`.
    childrenIds = [...existing.children]
  } else {
    // Replace children: drop the old descendants first (keeps the map clean
    // of stale ids), then build fresh nodes from the patch subtree.
    removeDescendantsFromMap(nodes, nodeId)
    const usedIds = new Set<string>(Object.keys(nodes))
    const buildResult = buildDescendants(patchNode.children, nodeId, nodes, usedIds)
    if (!buildResult.ok) return buildResult
    childrenIds = buildResult.childIds
  }

  // ---- cycle check: ensure no node's parent chain hits a duplicate ----
  // (defensive; should be impossible since we generate all new ids and the
  // target's parent is unchanged). We verify the target's parent chain
  // doesn't include the target itself.
  if (createsCycle(nodes, nodeId, existing.parent)) {
    return { ok: false, reason: "Applying this patch would create a parent/child cycle." }
  }

  // ---- write the merged target node ----
  nodes[nodeId] = {
    id: nodeId,
    type: existing.type, // authority: existing type, never the patch's
    props: mergedProps,
    styles: mergedStyles,
    children: childrenIds,
    parent: existing.parent, // preserved
  }

  return { ok: true, nodes }
}

/**
 * Recursively check a patch subtree for editor-internal fields (`id`/`parent`).
 * The AI must never set these; their presence means the patch is malformed.
 */
function containsEditorFields(node: PatchTreeNode): boolean {
  if ("id" in node || "parent" in node) return true
  return node.children.some(containsEditorFields)
}

/**
 * Remove all descendants of `nodeId` from the map (NOT nodeId itself).
 * Mutates `nodes` in place. Used when replacing children.
 */
function removeDescendantsFromMap(nodes: Record<string, Node>, nodeId: string): void {
  const target = nodes[nodeId]
  if (!target) return
  const stack = [...target.children]
  while (stack.length) {
    const cid = stack.pop()!
    const child = nodes[cid]
    if (!child) continue
    stack.push(...child.children)
    delete nodes[cid]
  }
}

/**
 * Build fresh descendant Node entries from a patch's nested children array,
 * assigning generated ids. Mutates `nodes` (adds new entries) and `usedIds`
 * (adds new ids). Returns the ordered list of child ids, or a rejection.
 */
function buildDescendants(
  patchChildren: PatchTreeNode[],
  parentId: string,
  nodes: Record<string, Node>,
  usedIds: Set<string>
): { ok: true; childIds: string[] } | { ok: false; reason: string } {
  const childIds: string[] = []
  for (const patchChild of patchChildren) {
    // generate a unique id
    let id = genId(safePrefix(patchChild.type))
    // defensive: guarantee uniqueness against the current map
    let guard = 0
    while (usedIds.has(id) && guard < 1000) {
      id = genId(safePrefix(patchChild.type))
      guard++
    }
    if (usedIds.has(id)) {
      return { ok: false, reason: "Could not generate a unique descendant id." }
    }
    usedIds.add(id)

    const node: Node = {
      id,
      type: patchChild.type,
      props: { ...patchChild.props },
      styles: { ...(patchChild.styles ?? {}) },
      children: [],
      parent: parentId,
    }
    nodes[id] = node
    childIds.push(id)

    // recurse into the patch child's children
    if (patchChild.children.length > 0) {
      const sub = buildDescendants(patchChild.children, id, nodes, usedIds)
      if (!sub.ok) return sub
      node.children = sub.childIds
    }
  }
  return { ok: true, childIds }
}

/** Build a safe genId prefix from a component type ("Hero" -> "hero"). */
function safePrefix(type: string): string {
  const cleaned = (type || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return cleaned || "n"
}

/**
 * Walk the parent chain from `nodeId` upward; if we revisit `nodeId`, a cycle
 * exists. (Defensive — should be impossible given id generation.)
 */
function createsCycle(nodes: Record<string, Node>, nodeId: string, startParent: string | null): boolean {
  let cur: string | null = startParent
  const seen = new Set<string>([nodeId])
  while (cur) {
    if (seen.has(cur)) return true
    seen.add(cur)
    const n = nodes[cur]
    if (!n) return false
    cur = n.parent
  }
  return false
}

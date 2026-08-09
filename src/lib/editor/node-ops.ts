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

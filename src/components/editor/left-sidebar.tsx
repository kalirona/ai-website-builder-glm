"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Layers,
  Component,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  X,
  Loader2,
  Sparkles,
  LayoutGrid,
  Type,
  Image as ImageIcon,
  GripVertical,
} from "lucide-react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { listComponentsByCategory, getComponent } from "@/lib/editor/registry"
import { useEditorStore } from "@/lib/editor/store"
import { useEditorContext } from "./editor-context"
import { PaletteItem } from "./palette-item"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { slugify, cn } from "@/lib/utils"
import type { Node, ComponentDefinition } from "@/lib/editor/types"

type Tab = "components" | "layers" | "pages"

/**
 * GrapesJS-style block categories. The registry's own `category` field
 * (layout/content/media/marketing) is the source of truth, but we re-bucket
 * into these user-facing groups so the Add panel matches what users expect
 * from GrapesJS:
 *   - Sections = marketing components (Hero, Features, Pricing, …)
 *   - Layout = Section, Container, Columns + Divider + Spacer
 *   - Basic = Heading, Text, Button
 *   - Media = Image, Video
 */
type BlockCategoryId = "sections" | "layout" | "basic" | "media"

const BLOCK_CATEGORY_META: {
  id: BlockCategoryId
  label: string
  icon: typeof Sparkles
}[] = [
  { id: "sections", label: "Sections", icon: Sparkles },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "basic", label: "Basic", icon: Type },
  { id: "media", label: "Media", icon: ImageIcon },
]

function blockCategoryFor(def: ComponentDefinition): BlockCategoryId {
  if (def.type === "Divider" || def.type === "Spacer") return "layout"
  if (def.category === "marketing") return "sections"
  if (def.category === "layout") return "layout"
  if (def.category === "media") return "media"
  // content (Heading, Text, Button)
  return "basic"
}

export function LeftSidebar({
  projectId,
  pages,
  currentPageSlug,
  onSelectPage,
}: {
  projectId: string
  pages: { slug: string; name: string }[]
  currentPageSlug: string
  onSelectPage: (slug: string) => void
}) {
  const [tab, setTab] = useState<Tab>("components")
  // Local copy of the pages list so newly-created pages show up immediately
  // without needing a server round-trip through the parent.
  const [localPages, setLocalPages] = useState(pages)
  useEffect(() => {
    setLocalPages(pages)
  }, [pages])

  const tabs: { id: Tab; label: string; icon: typeof Component }[] = [
    { id: "components", label: "Add", icon: Component },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "pages", label: "Pages", icon: FileText },
  ]

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex border-b">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                tab === t.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "components" && <ComponentsTab />}
        {tab === "layers" && <LayersTab />}
        {tab === "pages" && (
          <PagesTab
            projectId={projectId}
            pages={localPages}
            currentPageSlug={currentPageSlug}
            onSelectPage={onSelectPage}
            onPagesChange={setLocalPages}
          />
        )}
      </div>
    </div>
  )
}

function ComponentsTab() {
  const [query, setQuery] = useState("")
  const groups = listComponentsByCategory()

  // Re-group components into GrapesJS-style block categories. The registry's
  // own `category` (layout/content/media/marketing) is the starting point,
  // but we override for Divider / Spacer (move to Layout) so the categories
  // match what users expect from GrapesJS.
  const blockCategories = useMemo(() => {
    const cats: Record<BlockCategoryId, ComponentDefinition[]> = {
      sections: [],
      layout: [],
      basic: [],
      media: [],
    }
    for (const def of Object.values(groups).flat()) {
      const c = blockCategoryFor(def)
      cats[c].push(def)
    }
    // Stable ordering inside each category so the UI doesn't jump around.
    for (const k of Object.keys(cats) as BlockCategoryId[]) {
      cats[k].sort((a, b) => a.name.localeCompare(b.name))
    }
    return cats
  }, [groups])

  // Filter by search query — keep matching items but preserve category
  // structure so the user still sees which bucket each result is in.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return blockCategories
    const out: Record<BlockCategoryId, ComponentDefinition[]> = {
      sections: [],
      layout: [],
      basic: [],
      media: [],
    }
    ;(Object.keys(out) as BlockCategoryId[]).forEach((k) => {
      out[k] = blockCategories[k].filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q)
      )
    })
    return out
  }, [query, blockCategories])

  // Collapse state per category. Default: Sections expanded, others collapsed.
  // When the user is searching, expand all categories that have matches so
  // results are visible without manual expanding.
  const [collapsed, setCollapsed] = useState<Record<BlockCategoryId, boolean>>({
    sections: false,
    layout: true,
    basic: true,
    media: true,
  })
  const toggle = (id: BlockCategoryId) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))

  const isSearching = query.trim().length > 0
  const hasResults = (Object.keys(filtered) as BlockCategoryId[]).some(
    (k) => filtered[k].length > 0
  )

  return (
    <div className="space-y-2 p-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components…"
          className="h-8 pl-8 text-sm"
        />
      </div>

      {!hasResults && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No components match &quot;{query}&quot;
        </p>
      )}

      {BLOCK_CATEGORY_META.map((meta) => {
        const defs = filtered[meta.id]
        if (!defs || defs.length === 0) return null
        const Icon = meta.icon
        // When searching, ignore the collapse state so all matches show.
        const isCollapsed = !isSearching && collapsed[meta.id]
        return (
          <div
            key={meta.id}
            className="overflow-hidden rounded-lg border bg-background"
          >
            <button
              type="button"
              onClick={() => toggle(meta.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-muted/50"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-xs font-semibold uppercase tracking-wide">
                {meta.label}
              </span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {defs.length}
              </span>
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {!isCollapsed && (
              <div className="space-y-1.5 border-t bg-card/50 p-2">
                {defs.map((def) => (
                  <PaletteItem key={def.type} def={def} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LayersTab() {
  const { nodes, select, selectedId } = useEditorContext()
  const rootId = useEditorStore((s) => s.rootId)
  const moveNode = useEditorStore((s) => s.moveNode)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    nodeId: string
    pos: "before" | "after" | "inside"
  } | null>(null)

  // Compute the ancestor chain of the selected node so we can auto-expand
  // them — a selected node must always be visible in the Layers tree, even if
  // the user collapsed its parent earlier. Uses existing parent relationships.
  const selectedAncestors = useMemo(() => {
    const chain = new Set<string>()
    if (!selectedId) return chain
    let cur: string | null = selectedId
    let guard = 0
    while (cur && guard < 50) {
      const n = nodes[cur]
      if (!n) break
      if (n.parent) chain.add(n.parent)
      cur = n.parent
      guard++
    }
    return chain
  }, [selectedId, nodes])

  // A node is considered expanded if it's NOT in the collapsed set OR it's an
  // ancestor of the selected node (auto-expand).
  const isExpanded = (id: string) => !collapsed.has(id) || selectedAncestors.has(id)

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Scroll the selected row into view whenever selection changes.
  const selectedRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (selectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedId])

  // Separate DndContext for the Layers tree (simpler than sharing with the
  // canvas). Each layer row is both a draggable (via the grip handle that
  // appears on hover) and a droppable target. On drop we compute the
  // position (before / after / inside based on cursor Y) and call moveNode.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    if (id.startsWith("layer:")) {
      setActiveDragId(id.replace("layer:", ""))
    }
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const draggedId = activeDragId
    setActiveDragId(null)
    const target = dropTarget
    setDropTarget(null)
    if (!draggedId || !target || draggedId === target.nodeId) return

    const targetNode = nodes[target.nodeId]
    if (!targetNode) return
    // Can't drop a node into its own descendant.
    if (isDescendantOf(target.nodeId, draggedId, nodes)) return

    if (target.pos === "inside") {
      // Only canvas nodes can accept children.
      const def = getComponent(targetNode.type)
      if (!def?.isCanvas) return
      moveNode(draggedId, target.nodeId)
      // Expand the new parent so the dropped node is visible.
      setCollapsed((prev) => {
        const next = new Set(prev)
        next.delete(target.nodeId)
        return next
      })
      return
    }

    if (!targetNode.parent) return
    const parent = nodes[targetNode.parent]
    if (!parent) return
    const idx = parent.children.indexOf(target.nodeId)
    let newIdx = target.pos === "before" ? idx : idx + 1
    // If dragging within the same parent and currently before the target,
    // removal shifts the target left, so decrease by 1.
    if (parent.id === nodes[draggedId]?.parent) {
      const curIdx = parent.children.indexOf(draggedId)
      if (curIdx < newIdx) newIdx -= 1
    }
    moveNode(draggedId, parent.id, newIdx)
  }

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const def = getComponent(node.type)
    const isRoot = node.parent === null
    const Icon = def?.icon
    const isSelected = selectedId === node.id
    const hasChildren = node.children.length > 0
    const expanded = isExpanded(node.id)
    const isCanvas = !!def?.isCanvas
    const isDropTarget = dropTarget?.nodeId === node.id
    const dropPos = dropTarget?.pos
    const isDragging = activeDragId === node.id

    return (
      <LayerRow
        key={node.id}
        nodeId={node.id}
        depth={depth}
        isRoot={isRoot}
        isSelected={isSelected}
        hasChildren={hasChildren}
        expanded={expanded}
        isCanvas={isCanvas}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        dropPos={dropPos}
        onToggle={() => toggle(node.id)}
        onSelect={() => select(node.id)}
        onDragOver={(pos) => {
          if (activeDragId && activeDragId !== node.id) {
            setDropTarget({ nodeId: node.id, pos: pos })
          }
        }}
        onDragLeave={() => {
          setDropTarget((prev) =>
            prev?.nodeId === node.id ? null : prev
          )
        }}
        icon={Icon}
        label={isRoot ? "Page" : def?.name ?? node.type}
        selectedRef={isSelected ? selectedRef : undefined}
      >
        {expanded &&
          node.children.map((cid) => nodes[cid] && renderNode(nodes[cid], depth + 1))}
      </LayerRow>
    )
  }

  const root = nodes[rootId]
  if (!root) return <div className="p-3 text-xs text-muted-foreground">No layers</div>
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragId(null)
        setDropTarget(null)
      }}
    >
      <div className="p-2">{renderNode(root, 0)}</div>
    </DndContext>
  )
}

/**
 * Walks the parent chain from `nodeId` upward, returning true if `ancestorId`
 * appears anywhere along the way. Used to prevent dropping a node into its
 * own descendant (which would create a cycle).
 */
function isDescendantOf(
  nodeId: string,
  ancestorId: string,
  nodes: Record<string, Node>
): boolean {
  let cur: string | null = nodeId
  let guard = 0
  while (cur && guard < 50) {
    if (cur === ancestorId) return true
    const n = nodes[cur]
    if (!n) return false
    cur = n.parent
    guard++
  }
  return false
}

/**
 * A single Layers tree row. Combines a draggable grip handle (appears on
 * hover) with a droppable target on the whole row, so the user can either
 * click-to-select, drag-via-grip, or drop onto this row.
 */
function LayerRow({
  nodeId,
  depth,
  isRoot,
  isSelected,
  hasChildren,
  expanded,
  isCanvas,
  isDragging,
  isDropTarget,
  dropPos,
  onToggle,
  onSelect,
  onDragOver,
  onDragLeave,
  icon: Icon,
  label,
  selectedRef,
  children,
}: {
  nodeId: string
  depth: number
  isRoot: boolean
  isSelected: boolean
  hasChildren: boolean
  expanded: boolean
  isCanvas: boolean
  isDragging: boolean
  isDropTarget: boolean
  dropPos?: "before" | "after" | "inside"
  onToggle: () => void
  onSelect: () => void
  onDragOver: (pos: "before" | "after" | "inside") => void
  onDragLeave: () => void
  icon?: typeof ChevronDown
  label: string
  selectedRef?: React.RefObject<HTMLDivElement | null>
  children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging: isActuallyDragging } =
    useDraggable({
      id: `layer:${nodeId}`,
      data: { kind: "layer", nodeId },
      disabled: isRoot,
    })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `layer-drop:${nodeId}`,
    data: { nodeId, isCanvas },
    disabled: isRoot,
  })

  const setRef = (el: HTMLDivElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!isOver) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    if (isCanvas && y > h * 0.3 && y < h * 0.7) {
      onDragOver("inside")
    } else if (y < h * 0.5) {
      onDragOver("before")
    } else {
      onDragOver("after")
    }
  }

  return (
    <div>
      <div
        ref={setRef}
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "group relative flex items-center gap-1 rounded px-1 py-1 text-left text-xs transition",
          isSelected
            ? "bg-primary/10 text-primary ring-1 ring-primary/30"
            : "hover:bg-muted text-foreground",
          isDragging && "opacity-30",
          isDropTarget && dropPos === "inside" && "ring-2 ring-emerald-500"
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {/* Drop indicator (before / after) */}
        {isDropTarget && !isActuallyDragging && dropPos === "before" && (
          <div className="pointer-events-none absolute -top-0.5 left-0 right-0 h-0.5 bg-emerald-500" />
        )}
        {isDropTarget && !isActuallyDragging && dropPos === "after" && (
          <div className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 bg-emerald-500" />
        )}

        {/* Drag handle — visible on hover. The grip icon only starts a drag
            when the user mousedowns on it (not on the row itself), so
            click-to-select still works on the rest of the row. */}
        {!isRoot && (
          <button
            type="button"
            title="Drag to reorder"
            className="shrink-0 cursor-grab rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3" />
          </button>
        )}

        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Select on click */}
        <div
          ref={selectedRef}
          className="flex min-w-0 flex-1 items-center gap-1.5"
          onClick={onSelect}
        >
          {Icon ? (
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          ) : (
            <span className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

function PagesTab({
  projectId,
  pages,
  currentPageSlug,
  onSelectPage,
  onPagesChange,
}: {
  projectId: string
  pages: { slug: string; name: string }[]
  currentPageSlug: string
  onSelectPage: (slug: string) => void
  onPagesChange: (pages: { slug: string; name: string }[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [creating, setCreating] = useState(false)

  const startAdd = () => {
    setAdding(true)
    setName("")
    setSlug("")
  }
  const cancelAdd = () => {
    setAdding(false)
    setName("")
    setSlug("")
  }

  // Auto-derive slug from name when the user hasn't manually edited it.
  const handleNameChange = (v: string) => {
    setName(v)
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(v))
    }
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName || creating) return
    setCreating(true)
    try {
      const res = await fetch(`/api/pages/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, slug: slug.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to create page")
        return
      }
      const newPage = data.page as { slug: string; name: string }
      onPagesChange([...pages, newPage])
      setAdding(false)
      setName("")
      setSlug("")
      toast.success(`Page "${newPage.name}" created`)
      onSelectPage(newPage.slug)
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2 p-3">
      {!adding ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startAdd}
          className="w-full justify-start gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Page
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border bg-background p-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="About"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !creating) {
                  e.preventDefault()
                  handleCreate()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  cancelAdd()
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="about"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !creating) {
                  e.preventDefault()
                  handleCreate()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  cancelAdd()
                }
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="h-7 flex-1 text-xs"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={cancelAdd}
              disabled={creating}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1 pt-1">
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => onSelectPage(p.slug)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
              p.slug === currentPageSlug
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <FileText className="h-4 w-4 opacity-70" />
            <span className="flex-1 truncate">{p.name}</span>
            <span className="text-[11px] text-muted-foreground">/{p.slug}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { Layers, Component, FileText, ChevronRight, ChevronDown, Search } from "lucide-react"
import { listComponentsByCategory, getComponent } from "@/lib/editor/registry"
import { useEditorStore } from "@/lib/editor/store"
import { useEditorContext } from "./editor-context"
import { PaletteItem } from "./palette-item"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Node } from "@/lib/editor/types"

type Tab = "components" | "layers" | "pages"

export function LeftSidebar({
  pages,
  currentPageSlug,
  onSelectPage,
}: {
  pages: { slug: string; name: string }[]
  currentPageSlug: string
  onSelectPage: (slug: string) => void
}) {
  const [tab, setTab] = useState<Tab>("components")

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
            pages={pages}
            currentPageSlug={currentPageSlug}
            onSelectPage={onSelectPage}
          />
        )}
      </div>
    </div>
  )
}

function ComponentsTab() {
  const [query, setQuery] = useState("")
  const groups = listComponentsByCategory()
  const labels: Record<string, string> = {
    layout: "Elements",
    content: "Elements",
    media: "Elements",
    marketing: "Sections",
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.toLowerCase()
    const out: Record<string, typeof groups[string]> = {}
    for (const [cat, defs] of Object.entries(groups)) {
      const matched = defs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q)
      )
      if (matched.length > 0) out[cat] = matched
    }
    return out
  }, [query, groups])

  const hasResults = Object.values(filtered).some((d) => d.length > 0)

  return (
    <div className="space-y-3 p-3">
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

      {Object.entries(filtered).map(([cat, defs]) =>
        defs.length === 0 ? null : (
          <div key={cat}>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {labels[cat] ?? cat}
            </h3>
            <div className="space-y-1.5">
              {defs.map((def) => (
                <PaletteItem key={def.type} def={def} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}

function LayersTab() {
  const { nodes, select, selectedId } = useEditorContext()
  const rootId = useEditorStore((s) => s.rootId)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNode = (node: Node, depth: number) => {
    const def = getComponent(node.type)
    const isRoot = node.parent === null
    const Icon = def?.icon
    const isSelected = selectedId === node.id
    const hasChildren = node.children.length > 0
    const isCollapsed = collapsed.has(node.id)

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded px-1 py-1 text-left text-xs transition",
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-foreground"
          )}
          style={{ paddingLeft: depth * 14 + 4 }}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggle(node.id)
              }}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          {/* Select on click */}
          <button
            type="button"
            onClick={() => select(node.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            {Icon ? (
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {isRoot ? "Page" : def?.name ?? node.type}
            </span>
          </button>
        </div>
        {!isCollapsed &&
          node.children.map((cid) => nodes[cid] && renderNode(nodes[cid], depth + 1))}
      </div>
    )
  }

  const root = nodes[rootId]
  if (!root) return <div className="p-3 text-xs text-muted-foreground">No layers</div>
  return <div className="p-2">{renderNode(root, 0)}</div>
}

function PagesTab({
  pages,
  currentPageSlug,
  onSelectPage,
}: {
  pages: { slug: string; name: string }[]
  currentPageSlug: string
  onSelectPage: (slug: string) => void
}) {
  return (
    <div className="space-y-1 p-3">
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
  )
}

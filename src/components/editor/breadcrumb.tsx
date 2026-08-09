"use client"

import { ChevronRight } from "lucide-react"
import { useEditorContext } from "./editor-context"
import { getComponent } from "@/lib/editor/registry"
import { cn } from "@/lib/utils"

/**
 * Breadcrumb bar (Phase 2.8). Shows the parent chain of the selected node:
 *   Page / Hero / Container / Heading
 * Clicking a parent selects it. Uses the existing node parent relationships —
 * no separate data model.
 */
export function Breadcrumb() {
  const { nodes, selectedId, select } = useEditorContext()

  if (!selectedId) {
    return (
      <span className="text-xs text-muted-foreground">No selection</span>
    )
  }

  // Build the chain from the selected node up to the root.
  const chain: { id: string; name: string }[] = []
  let cur: string | null = selectedId
  let guard = 0
  while (cur && guard < 50) {
    const node = nodes[cur]
    if (!node) break
    const def = getComponent(node.type)
    const name = node.parent === null ? "Page" : def?.name ?? node.type
    chain.unshift({ id: cur, name })
    cur = node.parent
    guard++
  }

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto text-xs">
      {chain.map((item, i) => (
        <span key={item.id} className="flex items-center gap-0.5 shrink-0">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
          <button
            type="button"
            onClick={() => select(item.id)}
            className={cn(
              "rounded px-1.5 py-0.5 transition hover:bg-muted",
              i === chain.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  )
}

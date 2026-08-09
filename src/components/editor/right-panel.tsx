"use client"

import { useMemo } from "react"
import { Settings2, Box, Palette, Type } from "lucide-react"
import { useEditorStore } from "@/lib/editor/store"
import { getComponent } from "@/lib/editor/registry"
import { FieldRenderer } from "./controls"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { SettingsGroup } from "@/lib/editor/types"

const GROUP_META: { id: SettingsGroup; label: string; icon: typeof Box }[] = [
  { id: "content", label: "Content", icon: Box },
  { id: "layout", label: "Layout", icon: Settings2 },
  { id: "style", label: "Style", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
]

export function RightPanel() {
  const selectedId = useEditorStore((s) => s.selectedId)
  const nodes = useEditorStore((s) => s.nodes)
  const device = useEditorStore((s) => s.device)
  const updateProps = useEditorStore((s) => s.updateProps)
  const updateStyles = useEditorStore((s) => s.updateStyles)

  const selected = selectedId ? nodes[selectedId] : null
  const def = selected ? getComponent(selected.type) : null

  const grouped = useMemo(() => {
    if (!def) return null
    const map: Record<SettingsGroup, typeof def.settings> = {
      content: [],
      layout: [],
      style: [],
      typography: [],
    }
    for (const f of def.settings) {
      ;(map[f.group] ||= []).push(f)
    }
    return map
  }, [def])

  const handleUpdate = (patch: { props?: Record<string, unknown>; styles?: Record<string, unknown> }) => {
    if (!selectedId) return
    if (patch.props) updateProps(selectedId, patch.props)
    if (patch.styles) updateStyles(selectedId, patch.styles)
  }

  if (!selected || !def || !grouped) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Settings2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No selection</p>
        <p className="text-xs text-muted-foreground/70">
          Click a component on the canvas to edit its settings.
        </p>
      </div>
    )
  }

  const openGroups = GROUP_META.filter((g) => (grouped[g.id]?.length ?? 0) > 0).map((g) => g.id)

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <def.icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{def.name}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Editing {device} view
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <Accordion type="multiple" defaultValue={openGroups} className="space-y-2">
          {GROUP_META.map((g) => {
            const fields = grouped[g.id]
            if (!fields || fields.length === 0) return null
            const Icon = g.icon
            return (
              <AccordionItem
                key={g.id}
                value={g.id}
                className="rounded-lg border bg-background px-3"
              >
                <AccordionTrigger className="py-2.5 text-xs font-semibold uppercase tracking-wide hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {g.label}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3 pt-1">
                  {fields.map((f) => (
                    <FieldRenderer
                      key={f.key}
                      node={selected}
                      field={f}
                      onUpdate={handleUpdate}
                      device={device}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
  )
}

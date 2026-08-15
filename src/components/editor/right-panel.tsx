"use client"

import { useMemo } from "react"
import {
  Settings2,
  Box,
  Palette,
  Type,
  Square,
  AlignLeft,
  Sparkles,
  LayoutGrid,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react"
import { useEditorStore } from "@/lib/editor/store"
import { getComponent } from "@/lib/editor/registry"
import { FieldRenderer } from "./controls"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { SettingsField, Device } from "@/lib/editor/types"
import { cn } from "@/lib/utils"

/**
 * GrapesJS-style style manager. The right panel is organized into
 * collapsible sections (Content / Layout / Background / Borders / Spacing /
 * Typography / Effects) with a device tab bar on top that drives the canvas
 * viewport.
 *
 * Field grouping is heuristic — we look at each field's `group` and its key
 * to slot it into the most appropriate GrapesJS-style section. Fields that
 * don't have an obvious home fall back to Layout (the catch-all bucket).
 */

type SectionId =
  | "content"
  | "layout"
  | "background"
  | "borders"
  | "spacing"
  | "typography"
  | "effects"

interface SectionMeta {
  id: SectionId
  label: string
  icon: typeof Box
}

const SECTION_ORDER: SectionMeta[] = [
  { id: "content", label: "Content", icon: Box },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "background", label: "Background", icon: Palette },
  { id: "borders", label: "Borders", icon: Square },
  { id: "spacing", label: "Spacing", icon: AlignLeft },
  { id: "typography", label: "Typography", icon: Type },
  { id: "effects", label: "Effects", icon: Sparkles },
]

/**
 * Decide which section a field belongs in. The mapping is intentionally
 * heuristic — the registry's `group` property is the primary signal, but
 * we also peek at the key to disambiguate (e.g. `styles.background` and
 * `styles.textColor` are both in the "style" group, but background →
 * Background section, textColor → Typography section).
 */
function sectionForField(field: SettingsField): SectionId {
  const key = field.key.toLowerCase()
  // Layout group → Spacing if it's padding/margin/gap, else Layout
  if (field.group === "layout") {
    if (
      key.includes("padding") ||
      key.includes("margin") ||
      key.includes("gap")
    ) {
      return "spacing"
    }
    return "layout"
  }
  if (field.group === "content") {
    return "content"
  }
  if (field.group === "typography") {
    return "typography"
  }
  // group === "style" — disambiguate by key
  if (key.includes("background")) return "background"
  if (key.includes("border") || key.includes("radius")) return "borders"
  if (key.includes("shadow") || key.includes("opacity")) return "effects"
  if (
    key.includes("color") ||
    key.includes("textcolor") ||
    key.includes("font")
  ) {
    return "typography"
  }
  // variant, size, fit, thickness, etc. — most layout-y
  return "layout"
}

const DEVICES: { id: Device; icon: typeof Monitor; label: string }[] = [
  { id: "desktop", icon: Monitor, label: "Desktop" },
  { id: "tablet", icon: Tablet, label: "Tablet" },
  { id: "mobile", icon: Smartphone, label: "Mobile" },
]

export function RightPanel() {
  const selectedId = useEditorStore((s) => s.selectedId)
  const nodes = useEditorStore((s) => s.nodes)
  const device = useEditorStore((s) => s.device)
  const setDevice = useEditorStore((s) => s.setDevice)
  const updateProps = useEditorStore((s) => s.updateProps)
  const updateStyles = useEditorStore((s) => s.updateStyles)
  const updatePropsLive = useEditorStore((s) => s.updatePropsLive)
  const updateStylesLive = useEditorStore((s) => s.updateStylesLive)
  const commitHistory = useEditorStore((s) => s.commitHistory)

  const selected = selectedId ? nodes[selectedId] : null
  const def = selected ? getComponent(selected.type) : null

  // Group fields into the new GrapesJS-style sections.
  const grouped = useMemo(() => {
    const map: Record<SectionId, SettingsField[]> = {
      content: [],
      layout: [],
      background: [],
      borders: [],
      spacing: [],
      typography: [],
      effects: [],
    }
    if (!def) return map
    for (const f of def.settings) {
      const section = sectionForField(f)
      map[section].push(f)
    }
    return map
  }, [def])

  // Discrete controls (select, slider, toggle, color, image, list) — each
  // change is a discrete action that immediately commits a history entry.
  const handleUpdate = (patch: {
    props?: Record<string, unknown>
    styles?: Record<string, unknown>
  }) => {
    if (!selectedId) return
    if (patch.props) updateProps(selectedId, patch.props)
    if (patch.styles) updateStyles(selectedId, patch.styles)
  }

  // Live controls (text, textarea, responsive-text) — update the node
  // immediately on every keystroke (no history entry), then commit a single
  // history entry when the user stops typing (debounced) or blurs the input.
  const handleUpdateLive = (patch: {
    props?: Record<string, unknown>
    styles?: Record<string, unknown>
  }) => {
    if (!selectedId) return
    if (patch.props) updatePropsLive(selectedId, patch.props)
    if (patch.styles) updateStylesLive(selectedId, patch.styles)
  }

  if (!selected || !def) {
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

  // Default-open any section that has fields, plus always-open Content &
  // Layout so the panel doesn't feel empty on first selection.
  const openSections = SECTION_ORDER.filter(
    (s) => (grouped[s.id]?.length ?? 0) > 0
  ).map((s) => s.id)

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header: component name + device tab bar */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <def.icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{def.name}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Editing {device} view
        </p>
        {/* Device tab bar — drives the canvas viewport. Syncs with the
            top-bar device toggle and the responsive fields' device pickers. */}
        <div className="mt-2 flex items-center gap-1 rounded-md border bg-muted/40 p-1">
          {DEVICES.map((d) => {
            const Icon = d.icon
            const active = device === d.id
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDevice(d.id)}
                title={`Edit ${d.label} view`}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <Accordion
          type="multiple"
          defaultValue={openSections}
          className="space-y-2"
        >
          {SECTION_ORDER.map((section) => {
            const fields = grouped[section.id]
            if (!fields || fields.length === 0) return null
            const Icon = section.icon
            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="overflow-hidden rounded-lg border bg-background px-3"
              >
                <AccordionTrigger className="py-2.5 text-xs font-semibold uppercase tracking-wide hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {section.label}
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                      {fields.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3 pt-1">
                  {fields.map((f) => (
                    <FieldRenderer
                      key={f.key}
                      node={selected}
                      field={f}
                      onUpdate={handleUpdate}
                      onUpdateLive={handleUpdateLive}
                      onCommitHistory={commitHistory}
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

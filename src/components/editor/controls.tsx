"use client"

import { useState, useRef, useEffect } from "react"
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FolderOpen,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react"
import type { Node, SettingsField, Device } from "@/lib/editor/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { openAssetManager } from "./asset-manager"
import { useEditorStore } from "@/lib/editor/store"
import { cn } from "@/lib/utils"

/**
 * Common preset color swatches shown alongside the color picker — saves
 * typing common brand / neutral colors and matches GrapesJS's swatch row.
 */
const COLOR_SWATCHES = [
  "#000000",
  "#ffffff",
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
]

/** Device picker shared by responsive fields — D/T/M icons in a row. */
function DevicePicker({
  device,
  active,
  onSelect,
  className,
}: {
  device: Device
  active: boolean
  onSelect: (d: Device) => void
  className?: string
}) {
  const Icon = device === "desktop" ? Monitor : device === "tablet" ? Tablet : Smartphone
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect(device)
      }}
      title={`Edit ${device} value`}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

/** Update patch shape used by all field controls. */
export type UpdatePatch = {
  props?: Record<string, unknown>
  styles?: Record<string, unknown>
}

/** Debounce window for committing live text edits to history (ms). */
const LIVE_COMMIT_DEBOUNCE_MS = 400

/** Get a value by dot path from props or styles. */
export function getField(node: Node, key: string): unknown {
  let root: Record<string, unknown>
  let path: string
  if (key.startsWith("styles.")) {
    root = node.styles as Record<string, unknown>
    path = key.slice("styles.".length)
  } else {
    root = node.props as Record<string, unknown>
    path = key
  }
  const parts = path.split(".")
  let cur: unknown = root
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return cur
}

/** Set a value by dot path, returning a new props or styles object (immutable). */
export function setField(
  node: Node,
  key: string,
  value: unknown
): UpdatePatch {
  const isStyle = key.startsWith("styles.")
  const rootPath = isStyle ? key.slice("styles.".length) : key
  const source = (isStyle ? node.styles : node.props) as Record<string, unknown>
  const updated = setPath(source, rootPath.split("."), value)
  return isStyle ? { styles: updated } : { props: updated }
}

function setPath(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  const next = { ...obj }
  if (rest.length === 0) {
    next[head] = value
  } else {
    const child = (obj[head] && typeof obj[head] === "object" ? obj[head] : {}) as Record<string, unknown>
    next[head] = setPath(child, rest, value)
  }
  return next
}

/**
 * Hook: a debounced commit trigger used by text-style inputs.
 *
 * Returns a function the input calls on every keystroke; after the user stops
 * typing for LIVE_COMMIT_DEBOUNCE_MS, `onCommit` fires once (creating a single
 * undo entry for the burst). Also returns `flush()` (call on blur) and
 * `cancel()` (call on unmount / external change) helpers.
 */
function useDebouncedCommit(onCommit: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep the latest onCommit in a ref so the timer (which is created once)
  // always calls the freshest callback. Updated in an effect to avoid
  // mutating refs during render.
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  // Cleanup on unmount — never leave a dangling timer.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const schedule = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onCommitRef.current()
    }, LIVE_COMMIT_DEBOUNCE_MS)
  }

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      onCommitRef.current()
    }
  }

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return { schedule, flush, cancel }
}

/** The master field renderer. Picks the right control by type. */
export function FieldRenderer({
  node,
  field,
  onUpdate,
  onUpdateLive,
  onCommitHistory,
  device,
}: {
  node: Node
  field: SettingsField
  /** Discrete update — commits history immediately. Used by non-text controls. */
  onUpdate: (patch: UpdatePatch) => void
  /** Live update — mutates nodes immediately, no history. Used by text controls. */
  onUpdateLive?: (patch: UpdatePatch) => void
  /** Commit a single history entry after a burst of live updates. */
  onCommitHistory?: () => void
  device: Device
}) {
  const value = getField(node, field.key)

  // For text/textarea/responsive-text we prefer live updates so the canvas
  // reflects typing in real time without flooding the undo stack. If the
  // caller didn't pass live/commit callbacks (legacy), fall back to discrete.
  const useLive = onUpdateLive && onCommitHistory
  const liveUpdate = useLive ? onUpdateLive! : onUpdate
  const commit = useLive ? onCommitHistory! : undefined

  switch (field.type) {
    case "text":
      return (
        <TextInput
          label={field.label}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(v) => liveUpdate(setField(node, field.key, v))}
          onCommit={commit}
        />
      )
    case "textarea":
      return (
        <TextareaInput
          label={field.label}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(v) => liveUpdate(setField(node, field.key, v))}
          onCommit={commit}
        />
      )
    case "color":
      return (
        <ColorInput
          label={field.label}
          value={(value as string) ?? "#000000"}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
        />
      )
    case "select":
      return (
        <SelectInput
          label={field.label}
          value={(value as string) ?? ""}
          options={field.options ?? []}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
        />
      )
    case "slider":
      return (
        <SliderInput
          label={field.label}
          value={Number(value ?? field.min ?? 0)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
        />
      )
    case "toggle":
      return (
        <ToggleInput
          label={field.label}
          value={!!value}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
        />
      )
    case "image":
      return (
        <ImageInput
          label={field.label}
          value={(value as string) ?? ""}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
        />
      )
    case "responsive-text":
      return (
        <ResponsiveTextInput
          label={field.label}
          value={value as { desktop?: string; tablet?: string; mobile?: string } | string | undefined}
          device={device}
          placeholder={field.placeholder}
          onChange={(v) => liveUpdate(setField(node, field.key, v))}
          onCommit={commit}
        />
      )
    case "list":
      return (
        <ListInput
          label={field.label}
          value={(value as Record<string, unknown>[]) ?? []}
          itemFields={field.itemFields ?? []}
          node={node}
          fieldKey={field.key}
          onUpdate={onUpdate}
        />
      )
    default:
      return null
  }
}

/* ---------- individual controls ---------- */

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
  onCommit,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  /** Commit a debounced history entry. Used by text inputs. */
  onCommit?: () => void
}) {
  const { schedule, flush, cancel } = useDebouncedCommit(() => onCommit?.())
  // Cancel any pending commit if the component unmounts (e.g. selection
  // changed) without firing a spurious commit.
  useEffect(() => {
    return () => cancel()
  }, [cancel])

  return (
    <FieldRow label={label}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          if (onCommit) schedule()
        }}
        onBlur={() => {
          if (onCommit) flush()
        }}
        className="h-8 text-sm"
      />
    </FieldRow>
  )
}

function TextareaInput({
  label,
  value,
  placeholder,
  onChange,
  onCommit,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  onCommit?: () => void
}) {
  const { schedule, flush, cancel } = useDebouncedCommit(() => onCommit?.())
  useEffect(() => {
    return () => cancel()
  }, [cancel])

  return (
    <FieldRow label={label}>
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          if (onCommit) schedule()
        }}
        onBlur={() => {
          if (onCommit) flush()
        }}
        className="min-h-[72px] text-sm"
      />
    </FieldRow>
  )
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <FieldRow label={label}>
      {/* Swatches row — click to apply a preset color */}
      <div className="mb-1.5 flex flex-wrap gap-1">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={cn(
              "h-5 w-5 rounded border transition hover:scale-110",
              value?.toLowerCase() === c
                ? "ring-2 ring-primary ring-offset-1"
                : "border-border"
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
          placeholder="#000000 or var(--brand-primary)"
        />
      </div>
    </FieldRow>
  )
}

function normalizeColor(v: string): string {
  if (!v) return "#000000"
  if (v.startsWith("#") && (v.length === 7 || v.length === 4)) return v
  // fallback for var() / named colors
  return "#000000"
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  return (
    <FieldRow label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldRow>
  )
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => onChange(v[0])}
          className="flex-1"
        />
        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
    </FieldRow>
  )
}

function ToggleInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}

function ImageInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            openAssetManager({ currentValue: value, onChange })
          }}
          className="h-8 w-8 shrink-0 overflow-hidden rounded border border-input bg-muted transition hover:border-foreground/30"
          title="Browse assets"
        >
          {value ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
        <Input
          value={value}
          placeholder="https://… or Browse"
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={() => {
            openAssetManager({ currentValue: value, onChange })
          }}
        >
          Browse
        </Button>
      </div>
    </FieldRow>
  )
}

function ResponsiveTextInput({
  label,
  value,
  device,
  placeholder,
  onChange,
  onCommit,
}: {
  label: string
  value: { desktop?: string; tablet?: string; mobile?: string } | string | undefined
  device: Device
  placeholder?: string
  onChange: (v: { desktop: string; tablet?: string; mobile?: string }) => void
  onCommit?: () => void
}) {
  // Sync the active device with the canvas device via the store. The store
  // is the single source of truth — clicking a device tab here also updates
  // the canvas viewport so users can see their responsive edits live.
  const setDevice = useEditorStore((s) => s.setDevice)

  const resolved: { desktop: string; tablet?: string; mobile?: string } =
    typeof value === "string"
      ? { desktop: value }
      : { desktop: value?.desktop ?? "", tablet: value?.tablet, mobile: value?.mobile }

  const set = (d: Device, v: string) => onChange({ ...resolved, [d]: v })

  const { schedule, flush, cancel } = useDebouncedCommit(() => onCommit?.())
  useEffect(() => {
    return () => cancel()
  }, [cancel])

  return (
    <FieldRow label={label}>
      {/* GrapesJS-style responsive field: subtle background groups the 3
          inputs + device tab bar together so it's clear they share a value. */}
      <div className="rounded-md bg-muted/40 p-2">
        {/* Device tab bar — clicking sets the active canvas device so the
            user sees the responsive value applied live on the canvas. */}
        <div className="mb-1.5 flex items-center gap-1">
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
            <DevicePicker
              key={d}
              device={d}
              active={device === d}
              onSelect={setDevice}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
            <div
              key={d}
              className={cn(
                "relative transition-opacity",
                device === d ? "opacity-100" : "opacity-50"
              )}
            >
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-muted-foreground">
                {d[0]}
              </span>
              <Input
                value={(resolved[d] as string) ?? ""}
                placeholder={placeholder}
                onChange={(e) => {
                  set(d, e.target.value)
                  if (onCommit) schedule()
                }}
                onBlur={() => {
                  if (onCommit) flush()
                }}
                className={cn(
                  "h-8 pl-5 text-sm",
                  device === d && "ring-2 ring-primary"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </FieldRow>
  )
}

function ListInput({
  label,
  value,
  itemFields,
  node,
  fieldKey,
  onUpdate,
}: {
  label: string
  value: Record<string, unknown>[]
  itemFields: { key: string; label: string; type: string; placeholder?: string }[]
  node: Node
  fieldKey: string
  onUpdate: (patch: UpdatePatch) => void
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const updateItem = (idx: number, itemKey: string, v: unknown) => {
    const next = value.map((item, i) =>
      i === idx ? { ...item, [itemKey]: v } : item
    )
    onUpdate(setField(node, fieldKey, next))
  }

  const addItem = () => {
    const blank: Record<string, unknown> = {}
    itemFields.forEach((f) => {
      blank[f.key] = f.type === "textarea" ? "" : ""
    })
    const next = [...value, blank]
    onUpdate(setField(node, fieldKey, next))
    setOpenIdx(next.length - 1)
  }

  const removeItem = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    onUpdate(setField(node, fieldKey, next))
  }

  const moveItem = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir
    if (ni < 0 || ni >= value.length) return
    const next = [...value]
    ;[next[idx], next[ni]] = [next[ni], next[idx]]
    onUpdate(setField(node, fieldKey, next))
  }

  return (
    <FieldRow label={`${label} (${value.length})`}>
      <div className="space-y-1.5">
        {value.map((item, idx) => (
          <div key={idx} className="rounded-md border border-border">
            <div className="flex items-center gap-1 px-1.5 py-1">
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium"
              >
                {openIdx === idx ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span className="truncate">
                  {String(item[itemFields[0]?.key] ?? `${label} ${idx + 1}`)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => moveItem(idx, -1)}
                className="rounded p-0.5 hover:bg-muted"
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => moveItem(idx, 1)}
                className="rounded p-0.5 hover:bg-muted"
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                title="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {openIdx === idx && (
              <div className="space-y-2 border-t bg-muted/30 p-2">
                {itemFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {f.label}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={String(item[f.key] ?? "")}
                        placeholder={f.placeholder}
                        onChange={(e) => updateItem(idx, f.key, e.target.value)}
                        className="min-h-[56px] text-xs"
                      />
                    ) : (
                      <Input
                        value={String(item[f.key] ?? "")}
                        placeholder={f.placeholder}
                        onChange={(e) => updateItem(idx, f.key, e.target.value)}
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="h-7 w-full text-xs"
        >
          <Plus className="h-3 w-3" /> Add {label.replace(/s$/i, "")}
        </Button>
      </div>
    </FieldRow>
  )
}

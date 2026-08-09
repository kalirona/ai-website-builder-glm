"use client"

import { useState } from "react"
import { Plus, Trash2, ChevronDown, ChevronUp, ChevronRight } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
): { props?: Record<string, unknown>; styles?: Record<string, unknown> } {
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

/** The master field renderer. Picks the right control by type. */
export function FieldRenderer({
  node,
  field,
  onUpdate,
  device,
}: {
  node: Node
  field: SettingsField
  onUpdate: (patch: { props?: Record<string, unknown>; styles?: Record<string, unknown> }) => void
  device: Device
}) {
  const value = getField(node, field.key)

  switch (field.type) {
    case "text":
      return (
        <TextInput
          label={field.label}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
        />
      )
    case "textarea":
      return (
        <TextareaInput
          label={field.label}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(v) => onUpdate(setField(node, field.key, v))}
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
          onChange={(v) => onUpdate(setField(node, field.key, v))}
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
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <FieldRow label={label}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <FieldRow label={label}>
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-input bg-muted">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <Input
          value={value}
          placeholder="https://… or leave empty"
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
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
}: {
  label: string
  value: { desktop?: string; tablet?: string; mobile?: string } | string | undefined
  device: Device
  placeholder?: string
  onChange: (v: { desktop: string; tablet?: string; mobile?: string }) => void
}) {
  const resolved: { desktop: string; tablet?: string; mobile?: string } =
    typeof value === "string"
      ? { desktop: value }
      : { desktop: value?.desktop ?? "", tablet: value?.tablet, mobile: value?.mobile }

  const set = (d: Device, v: string) => onChange({ ...resolved, [d]: v })

  return (
    <FieldRow label={label}>
      <div className="grid grid-cols-3 gap-1.5">
        {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
          <div key={d} className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-muted-foreground">
              {d[0]}
            </span>
            <Input
              value={(resolved[d] as string) ?? ""}
              placeholder={placeholder}
              onChange={(e) => set(d, e.target.value)}
              className={cn(
                "h-8 pl-5 text-sm",
                device === d && "ring-2 ring-primary"
              )}
            />
          </div>
        ))}
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
  onUpdate: (patch: { props?: Record<string, unknown>; styles?: Record<string, unknown> }) => void
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

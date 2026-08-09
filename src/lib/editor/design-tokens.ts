import type { DesignTokens, Device, Responsive } from "./types"
import { defaultDesignTokens } from "./types"

/** Resolve a responsive value for the active device (falls back to desktop). */
export function resolveResponsive<T>(
  value: T | Responsive<T> | undefined,
  device: Device,
  fallback: T
): T {
  if (value === undefined || value === null) return fallback
  if (typeof value !== "object" || Array.isArray(value)) return value as T
  const r = value as Responsive<T>
  if (typeof r.desktop === "undefined" && !("tablet" in r) && !("mobile" in r)) {
    return value as T
  }
  const v = r[device] ?? r.desktop
  return (v === undefined ? fallback : v) as T
}

/** Convert design tokens into an inline CSS variable style object. */
export function tokensToCssVars(tokens: DesignTokens): React.CSSProperties {
  const t = { ...defaultDesignTokens, ...tokens }
  return {
    ["--brand-primary" as string]: t.primary,
    ["--brand-secondary" as string]: t.secondary,
    ["--brand-accent" as string]: t.accent,
    ["--brand-background" as string]: t.background,
    ["--brand-foreground" as string]: t.foreground,
    ["--brand-muted" as string]: t.muted,
    ["--brand-border" as string]: t.border,
    ["--brand-radius" as string]: t.radius,
    ["--brand-heading-font" as string]: t.headingFont,
    ["--brand-body-font" as string]: t.bodyFont,
  }
}

/** Map a viewport device to a canvas width (px). null = full width. */
export function deviceWidth(device: Device): number | null {
  switch (device) {
    case "mobile":
      return 390
    case "tablet":
      return 820
    default:
      return null
  }
}

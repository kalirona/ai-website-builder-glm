"use client"

import type { Device, Responsive } from "@/lib/editor/types"
import { resolveResponsive } from "@/lib/editor/design-tokens"

/**
 * Convenience wrapper around `resolveResponsive` that accepts an unknown
 * value (e.g. coming from `Record<string, unknown>` node styles) and returns
 * a typed string for the active device.
 */
export function rs(
  value: unknown,
  device: Device,
  fallback: string
): string {
  return resolveResponsive<string>(
    value as string | Responsive<string> | undefined,
    device,
    fallback
  )
}

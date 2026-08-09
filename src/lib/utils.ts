import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Generate a short unique id (good enough for editor nodes). */
export function genId(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** Slugify a string for URLs / project slugs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled"
}

/** Safely parse JSON with a fallback. */
export function safeParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Format a date for display in the dashboard. */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString()
}

export function initials(name?: string | null): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

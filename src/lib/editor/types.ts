import type { LucideIcon } from "lucide-react"

/** A value that can vary per breakpoint. */
export type Responsive<T> = {
  desktop: T
  tablet?: T
  mobile?: T
}

/** Resolves a responsive value for the active device. */
export type Device = "desktop" | "tablet" | "mobile"

/** A single node in the page tree. This is the source of truth. */
export interface Node {
  id: string
  type: string // registry key, e.g. "Hero"
  props: Record<string, unknown> // content fields
  styles: Record<string, unknown> // style + responsive values
  children: string[] // ordered child node ids
  parent: string | null
}

/** The serialized editor document stored in Page.editorData. */
export interface EditorData {
  nodes: Record<string, Node>
  rootId: string
}

/** Global design system tokens stored on Website.globalStyles. */
export interface DesignTokens {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  border: string
  radius: string
  headingFont: string
  bodyFont: string
}

export const defaultDesignTokens: DesignTokens = {
  primary: "#4f46e5",
  secondary: "#0ea5e9",
  accent: "#f59e0b",
  background: "#ffffff",
  foreground: "#0f172a",
  muted: "#f1f5f9",
  border: "#e2e8f0",
  radius: "12px",
  headingFont: "var(--font-geist-sans)",
  bodyFont: "var(--font-geist-sans)",
}

/** Nav item used by Navbar/Footer. */
export interface NavItem {
  label: string
  url: string
}

export type SettingsFieldType =
  | "text"
  | "textarea"
  | "color"
  | "select"
  | "slider"
  | "toggle"
  | "image"
  | "responsive-text"
  | "list"

export type SettingsGroup =
  | "content"
  | "layout"
  | "style"
  | "typography"

export interface SettingsField {
  /** Dot path: "props.heading" or "styles.fontSize" */
  key: string
  label: string
  group: SettingsGroup
  type: SettingsFieldType
  options?: { label: string; value: string }[]
  min?: number
  max?: number
  step?: number
  /** show desktop/tablet/mobile sub-tabs */
  responsive?: boolean
  placeholder?: string
  /** for list type: schema for each item */
  itemFields?: { key: string; label: string; type: SettingsFieldType; placeholder?: string }[]
}

export interface RenderContext {
  device: Device
  designTokens: DesignTokens
  /** editor-only: whether to render selection wrappers & inline editing */
  editable?: boolean
}

export interface RenderProps<P = Record<string, unknown>> {
  node: Node
  props: P
  styles: Record<string, unknown>
  ctx: RenderContext
  /** render child nodes */
  children?: React.ReactNode
}

export interface DefaultChildDef {
  type: string
  props?: Record<string, unknown>
  styles?: Record<string, unknown>
}

export interface ComponentDefinition<P = Record<string, unknown>> {
  type: string
  name: string
  icon: LucideIcon
  category: "layout" | "content" | "media" | "marketing"
  description?: string
  /** can contain child nodes */
  isCanvas?: boolean
  allowedChildren?: string[] | "*"
  defaultProps: P
  defaultStyles: Record<string, unknown>
  /**
   * When a canvas component is added via the palette, these children are
   * auto-created inside it. Each entry is { type, props?, styles? }. The
   * child's defaultProps/defaultStyles from the registry are merged in.
   * If omitted, the canvas starts empty.
   */
  defaultChildren?: DefaultChildDef[]
  render: (p: RenderProps<P>) => React.ReactNode
  settings: SettingsField[]
}

export type ComponentRegistry = Record<string, ComponentDefinition>

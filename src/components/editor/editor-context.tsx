"use client"

import { createContext, useContext } from "react"
import type { Device, DesignTokens, Node } from "@/lib/editor/types"

export interface EditorContextValue {
  editable: boolean
  device: Device
  designTokens: DesignTokens
  nodes: Record<string, Node>
  select: (id: string | null) => void
  updateProps: (id: string, patch: Record<string, unknown>) => void
  selectedId: string | null
  /** nodeId currently being AI-previewed, or null (Phase 2.8). */
  previewNodeId: string | null
}

const noop = () => {}

const PreviewContextValue: EditorContextValue = {
  editable: false,
  device: "desktop",
  designTokens: {} as DesignTokens,
  nodes: {},
  select: noop,
  updateProps: noop,
  selectedId: null,
  previewNodeId: null,
}

const EditorContext = createContext<EditorContextValue>(PreviewContextValue)

export function EditorContextProvider({
  value,
  children,
}: {
  value: EditorContextValue
  children: React.ReactNode
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditorContext(): EditorContextValue {
  return useContext(EditorContext)
}

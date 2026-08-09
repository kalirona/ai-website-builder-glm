"use client"

import { useEffect } from "react"
import { useEditorStore } from "@/lib/editor/store"

/** Global editor keyboard shortcuts. */
export function useEditorShortcuts(opts: {
  onSave: () => void
}) {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const removeNode = useEditorStore((s) => s.removeNode)
  const duplicateNode = useEditorStore((s) => s.duplicateNode)
  const selectedId = useEditorStore((s) => s.selectedId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore when typing in inputs / contenteditable
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox")
      ) {
        // still allow save (cmd/ctrl+s)
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault()
          opts.onSave()
        }
        return
      }

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault()
        if (selectedId) duplicateNode(selectedId)
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault()
        opts.onSave()
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault()
        removeNode(selectedId)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [undo, redo, removeNode, duplicateNode, selectedId, opts])
}

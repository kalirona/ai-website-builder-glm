"use client"

import { useEffect, useRef } from "react"
import { useEditorContext } from "./editor-context"

/**
 * Inline-editable text. In editor mode renders a contentEditable span that
 * commits to the node store on blur / Enter. In preview renders a plain span.
 *
 * IMPORTANT (Phase 2.9 fix): we must NOT swallow the click entirely — the
 * NodeWrapper needs to see the click so it can select the node. Previously
 * `stopPropagation` on onClick/onMouseDown prevented selection when the user
 * clicked directly on the text. Now we only stopPropagation on mousedown
 * (to prevent the drag listener from starting) but let the click bubble to
 * the NodeWrapper for selection. The contentEditable still receives focus
 * via the double-click handler in NodeWrapper.
 */
export function InlineText({
  nodeId,
  propKey,
  value,
  as: Tag = "span",
  className,
  style,
  placeholder = "Click to edit",
  multiline = false,
}: {
  nodeId: string
  propKey: string
  value: string
  as?: React.ElementType
  className?: string
  /** Optional inline styles merged with the editable affordances. */
  style?: React.CSSProperties
  placeholder?: string
  multiline?: boolean
}) {
  const { editable, updateProps, select } = useEditorContext()
  const ref = useRef<HTMLElement>(null)

  // keep DOM in sync when external value changes (e.g. undo/redo, AI update,
  // right-panel edit). Only update if the element is NOT currently focused
  // (otherwise we'd jump the cursor while the user is typing).
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      if (ref.current.textContent !== value) {
        ref.current.textContent = value
      }
    }
  }, [value])

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    )
  }

  return (
    <Tag
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={className}
      style={{ outline: "none", cursor: "text", ...style }}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      data-inline-text="true"
      // Do NOT stopPropagation on click — let it bubble to NodeWrapper so the
      // node gets selected. We DO stopPropagation on mousedown to prevent the
      // @dnd-kit drag listener from starting a drag when the user clicks text.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        // Select the node this InlineText belongs to (in case the click
        // didn't reach the wrapper). stopPropagation so the parent wrapper
        // doesn't ALSO fire select (harmless, but avoids double work).
        select(nodeId)
        e.stopPropagation()
      }}
      onBlur={(e) => {
        const text = e.currentTarget.textContent ?? ""
        if (text !== value) updateProps(nodeId, { [propKey]: text })
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
        e.stopPropagation()
      }}
      aria-label={placeholder}
    >
      {value}
    </Tag>
  )
}

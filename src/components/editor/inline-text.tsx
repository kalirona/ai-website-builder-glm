"use client"

import { useEffect, useRef } from "react"
import { useEditorContext } from "./editor-context"

/**
 * Inline-editable text. In editor mode renders a contentEditable span that
 * commits to the node store on blur / Enter. In preview renders a plain span.
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
  const { editable, updateProps } = useEditorContext()
  const ref = useRef<HTMLElement>(null)

  // keep DOM in sync when external value changes (e.g. undo/redo, AI update)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value
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
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
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

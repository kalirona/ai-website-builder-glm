"use client"

import { useMemo, useState } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Code2, Copy, Check } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useEditorStore } from "@/lib/editor/store"
import { EditorContextProvider } from "./editor-context"
import { NodeRenderer } from "./node-renderer"
import { tokensToCssVars } from "@/lib/editor/design-tokens"
import { toast } from "sonner"

/**
 * Read-only HTML preview of the current page (Feature 7). Opens a Sheet
 * from the top bar showing the static HTML that the NodeRenderer would
 * produce for the current page — useful for debugging what's actually
 * being generated.
 *
 * Implementation:
 *   - Wraps `<NodeRenderer>` in an `EditorContextProvider` with
 *     `editable: false` so it renders clean HTML (no NodeWrapper, no
 *     selection chrome, no contentEditable attrs).
 *   - Calls `renderToStaticMarkup` to get a single HTML string.
 *   - Re-generates whenever nodes / designTokens / device change so the
 *     preview stays in sync with the canvas.
 *
 * The HTML is shown read-only with syntax highlighting. A Copy button
 * copies the raw HTML to the clipboard.
 */
export function CodeViewToggle() {
  const nodes = useEditorStore((s) => s.nodes)
  const rootId = useEditorStore((s) => s.rootId)
  const device = useEditorStore((s) => s.device)
  const designTokens = useEditorStore((s) => s.designTokens)
  const hydrated = useEditorStore((s) => s.hydrated)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate the HTML lazily — only when the Sheet is open, since
  // renderToStaticMarkup is synchronous and walks the entire tree.
  const html = useMemo(() => {
    if (!hydrated || !open) return ""
    if (!nodes[rootId]) return ""
    // Build the React tree outside the try/catch — React renders lazily so
    // catching construction errors with try/catch doesn't work and the
    // linter (rightly) flags it. Errors during rendering will surface from
    // renderToStaticMarkup below.
    const tree = (
      <EditorContextProvider
        value={{
          editable: false,
          device,
          designTokens,
          nodes,
          select: () => {},
          updateProps: () => {},
          selectedId: null,
          previewNodeId: null,
        }}
      >
        <NodeRenderer nodeId={rootId} />
      </EditorContextProvider>
    )
    let markup: string
    try {
      markup = renderToStaticMarkup(tree)
    } catch (err) {
      return `<!-- failed to render: ${(err as Error).message} -->`
    }
    const styleVars = Object.entries(tokensToCssVars(designTokens))
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n")
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Generated page</title>
  <style>
:root {
${styleVars}
}
  </style>
</head>
<body>
${indentHtml(markup)}
</body>
</html>`
  }, [hydrated, open, nodes, rootId, device, designTokens])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      toast.success("HTML copied to clipboard")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Code2 className="h-4 w-4" />
          <span className="hidden sm:inline">Code</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Generated HTML
          </SheetTitle>
          <SheetDescription>
            Read-only preview of the static HTML the renderer produces for
            this page. Updates live as you edit.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <span className="text-[11px] text-muted-foreground">
            {html.length.toLocaleString()} chars · {html.split("\n").length}{" "}
            lines
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {html ? (
            <SyntaxHighlighter
              language="markup"
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: "16px",
                background: "transparent",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
              wrapLongLines={false}
            >
              {html}
            </SyntaxHighlighter>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Nothing to render yet. Add components to see the HTML output.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Very light HTML indenter — adds a newline + 2 spaces before each opening
 * tag so the output isn't one long line. Not a full pretty-printer (it
 * doesn't try to balance tags or handle attributes spanning lines), but
 * it's enough for the read-only preview to be readable.
 */
function indentHtml(html: string): string {
  // Split on tag boundaries. Keep the tags themselves intact.
  const tokens = html.split(/(?=<)/g)
  let depth = 0
  const lines: string[] = []
  for (const token of tokens) {
    if (!token) continue
    const isClosing = /^<\/[^>]+>/.test(token)
    const isOpening = /^<[^/!?][^>]*[^/]>$/.test(token) || /^<[^/!?][^>]*>$/.test(token)
    const isSelfClosing = /\/>$/.test(token)
    if (isClosing && depth > 0) depth--
    lines.push(`${"  ".repeat(depth)}${token.trim()}`)
    if (isOpening && !isSelfClosing && !isClosing) depth++
  }
  return lines.join("\n")
}

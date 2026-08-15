"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Link2, Check, ImageOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/**
 * GrapesJS-style asset manager. A modal grid of stock images the user can
 * pick from, plus a "paste URL" tab. On select, calls `onChange(url)` with
 * the chosen image URL.
 *
 * For MVP the library is a hardcoded list of Unsplash URLs grouped by
 * category. TODO: connect to Directus media library so users can upload
 * and reuse their own assets across pages.
 */

export type AssetCategory = "business" | "tech" | "food" | "nature" | "people" | "abstract"

interface StockAsset {
  url: string
  category: AssetCategory
  label: string
}

const STOCK_LIBRARY: StockAsset[] = [
  // Business
  { url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80", category: "business", label: "Office team meeting" },
  { url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80", category: "business", label: "Laptop on desk" },
  { url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80", category: "business", label: "Team collaboration" },
  { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80", category: "business", label: "Analytics dashboard" },
  { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80", category: "business", label: "Modern office tower" },
  { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80", category: "business", label: "Workspace standup" },

  // Tech
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80", category: "tech", label: "Circuit board" },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80", category: "tech", label: "Microchip" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=80", category: "tech", label: "Laptop with code" },
  { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80", category: "tech", label: "Developer setup" },
  { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80", category: "tech", label: "Analytics chart" },
  { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80", category: "tech", label: "Code editor" },

  // Food
  { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80", category: "food", label: "Gourmet plate" },
  { url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=80", category: "food", label: "Salad bowl" },
  { url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80", category: "food", label: "Healthy breakfast" },
  { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80", category: "food", label: "Restaurant interior" },

  // Nature
  { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80", category: "nature", label: "Mountain lake" },
  { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80", category: "nature", label: "Morning fog" },
  { url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&q=80", category: "nature", label: "Valley landscape" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", category: "nature", label: "Forest sunlight" },

  // People
  { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&q=80", category: "people", label: "Smiling portrait" },
  { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&q=80", category: "people", label: "Man portrait" },
  { url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1200&q=80", category: "people", label: "Woman portrait" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80", category: "people", label: "Headshot" },

  // Abstract
  { url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&q=80", category: "abstract", label: "Gradient waves" },
  { url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80", category: "abstract", label: "Colorful shapes" },
  { url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80", category: "abstract", label: "Geometric pattern" },
  { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80", category: "abstract", label: "Abstract gradient" },
]

const CATEGORY_LABELS: { id: AssetCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "business", label: "Business" },
  { id: "tech", label: "Tech" },
  { id: "food", label: "Food" },
  { id: "nature", label: "Nature" },
  { id: "people", label: "People" },
  { id: "abstract", label: "Abstract" },
]

/**
 * Lightweight module-level store so any ImageInput can open the picker
 * without prop-drilling. State: `{ open, value, onChange }` — when `open`
 * is true the picker renders, and on select it calls the registered
 * `onChange` then closes.
 */
let openState: {
  open: boolean
  currentValue: string
  onChange: ((url: string) => void) | null
} = { open: false, currentValue: "", onChange: null }
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function openAssetManager(opts: {
  currentValue?: string
  onChange: (url: string) => void
}) {
  openState = {
    open: true,
    currentValue: opts.currentValue ?? "",
    onChange: opts.onChange,
  }
  notify()
}

function closeAssetManager() {
  openState = { open: false, currentValue: "", onChange: null }
  notify()
}

function useOpenState() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return openState
}

/**
 * The picker dialog. Mount once (e.g. in the editor shell) and let any
 * ImageInput open it via `openAssetManager`.
 *
 * TODO: connect to Directus media library — replace STOCK_LIBRARY with
 * the user's uploaded assets and add an upload tab that POSTs files to
 * /api/media.
 */
export function AssetManager() {
  const state = useOpenState()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<AssetCategory | "all">("all")
  const [urlInput, setUrlInput] = useState("")
  const [urlError, setUrlError] = useState<string | null>(null)
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STOCK_LIBRARY.filter((a) => {
      if (category !== "all" && a.category !== category) return false
      if (q && !a.label.toLowerCase().includes(q) && !a.category.includes(q)) return false
      return true
    })
  }, [query, category])

  const handleSelect = (url: string) => {
    state.onChange?.(url)
    closeAssetManager()
  }

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setUrlError("Please paste an image URL.")
      return
    }
    // Basic URL validation — must start with http(s)://
    try {
      const u = new URL(trimmed)
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        setUrlError("URL must start with http:// or https://")
        return
      }
    } catch {
      setUrlError("That doesn't look like a valid URL.")
      return
    }
    setUrlError(null)
    handleSelect(trimmed)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setQuery("")
      setCategory("all")
      setUrlInput("")
      setUrlError(null)
      setHoveredUrl(null)
      closeAssetManager()
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asset Manager</DialogTitle>
          <DialogDescription>
            Pick a stock image or paste an image URL. Selected image will be
            inserted into the field.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">
              Library
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1">
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search images…"
                className="h-8 pl-8 text-sm"
              />
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_LABELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition",
                    category === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Grid of assets — scrollable, custom scrollbar */}
            <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 [scrollbar-width:thin]">
              {filtered.length === 0 ? (
                <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <ImageOff className="h-8 w-8 opacity-40" />
                  No images match your search.
                </div>
              ) : (
                filtered.map((asset) => (
                  <button
                    key={asset.url}
                    type="button"
                    onClick={() => handleSelect(asset.url)}
                    onMouseEnter={() => setHoveredUrl(asset.url)}
                    onMouseLeave={() => setHoveredUrl(null)}
                    className={cn(
                      "group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted transition",
                      state.currentValue === asset.url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <img
                      src={asset.url}
                      alt={asset.label}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div
                      className={cn(
                        "absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1.5 text-left text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100",
                        hoveredUrl === asset.url && "opacity-100"
                      )}
                    >
                      {asset.label}
                    </div>
                    {state.currentValue === asset.url && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste a direct image URL (e.g. from your CDN, S3 bucket, or any
              publicly accessible image).
            </p>
            <Input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                if (urlError) setUrlError(null)
              }}
              placeholder="https://example.com/image.jpg"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleUrlSubmit()
                }
              }}
            />
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
            {urlInput && !urlError && (
              <div className="overflow-hidden rounded-md border bg-muted">
                <img
                  src={urlInput}
                  alt="Preview"
                  className="mx-auto h-32 w-auto object-contain"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  }}
                />
              </div>
            )}
            <Button type="button" onClick={handleUrlSubmit} className="w-full">
              Use this URL
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

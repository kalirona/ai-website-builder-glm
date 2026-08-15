"use client"

import { useEffect, useState, type RefObject } from "react"
import { cn } from "@/lib/utils"

/**
 * GrapesJS / Figma-style canvas rulers. Two thin (20px) rulers — horizontal
 * along the top of the canvas scroll area and vertical along the left — that
 * show pixel ticks every 50px with major labels every 100px.
 *
 * Layout:
 *   - The rulers are siblings of the scroll area (NOT overlays), so they
 *     stay visible while the user scrolls.
 *   - The inner tick track is translated by `-scrollLeft` / `-scrollTop`
 *     so the tick numbers correspond to the actual content position — this
 *     gives the illusion that the ruler scrolls with the content.
 *   - The corner where the two rulers intersect is filled with a solid
 *     block so the ticks don't show through.
 *
 * The parent provides a ref to the scrollable container so we can subscribe
 * to its scroll event. This keeps the rulers in sync without lifting scroll
 * state into the store.
 */
export function RulerBar({
  scrollRef,
  orientation,
  contentLength,
  className,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  orientation: "horizontal" | "vertical"
  /** Total scrollable content length (width for horizontal, height for
   *  vertical) — used to size the inner tick track so it covers the
   *  whole scrollable range. */
  contentLength?: number
  className?: string
}) {
  const [scrollPos, setScrollPos] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      setScrollPos(
        orientation === "horizontal" ? el.scrollLeft : el.scrollTop
      )
    }
    onScroll()
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [scrollRef, orientation])

  // Long enough to cover typical page sizes. Add a generous buffer so the
  // ticks don't end abruptly even when the user scrolls far.
  const trackLength = Math.max(
    2400,
    (contentLength ?? 0) + 400
  )
  const tickCount = Math.ceil(trackLength / 50)

  if (orientation === "horizontal") {
    return (
      <div
        className={cn(
          "relative h-5 shrink-0 overflow-hidden border-b bg-slate-100/95 backdrop-blur-sm dark:bg-slate-900/95",
          className
        )}
        aria-hidden
      >
        <div
          className="relative h-full"
          style={{
            width: trackLength,
            transform: `translateX(${-scrollPos}px)`,
          }}
        >
          {Array.from({ length: tickCount }, (_, i) => {
            const px = i * 50
            const isMajor = px % 100 === 0
            return (
              <div
                key={px}
                className={cn(
                  "absolute bottom-0 w-px bg-slate-400 dark:bg-slate-600",
                  isMajor ? "h-3" : "h-1.5"
                )}
                style={{ left: px }}
              >
                {isMajor && (
                  <span className="absolute top-0.5 left-1 text-[9px] leading-none font-medium text-slate-600 tabular-nums dark:text-slate-400">
                    {px}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative w-5 shrink-0 overflow-hidden border-r bg-slate-100/95 backdrop-blur-sm dark:bg-slate-900/95",
        className
      )}
      aria-hidden
    >
      <div
        className="relative w-full"
        style={{
          height: trackLength,
          transform: `translateY(${-scrollPos}px)`,
        }}
      >
        {Array.from({ length: tickCount }, (_, i) => {
          const px = i * 50
          const isMajor = px % 100 === 0
          return (
            <div
              key={px}
              className={cn(
                "absolute right-0 h-px bg-slate-400 dark:bg-slate-600",
                isMajor ? "w-3" : "w-1.5"
              )}
              style={{ top: px }}
            >
              {isMajor && (
                <span
                  className="absolute right-3 top-[-5px] text-[9px] leading-none font-medium text-slate-600 tabular-nums dark:text-slate-400"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {px}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Corner block where the horizontal and vertical rulers meet. */
export function RulerCorner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 shrink-0 border-b border-r bg-slate-200/95 dark:bg-slate-800/95",
        className
      )}
      aria-hidden
    />
  )
}

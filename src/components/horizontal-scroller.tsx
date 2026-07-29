'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A single horizontally-scrolling row, with snap and direction-aware arrows.
 *
 * The cards render on the server and are handed in as children; this owns only
 * the scroll behaviour, so nothing about the content ships as client logic. The
 * partial card at the trailing edge is the affordance — it says "there's more"
 * without a visible scrollbar. Touch users swipe; the arrows are a desktop
 * convenience.
 *
 * Both arrows persist at half opacity so the row reads as scrollable at a
 * glance. The one pointing somewhere there's more to see brightens on hover and
 * is clickable; the one with nothing that way stays dim and inert — a signpost,
 * not a dead control.
 */
export function HorizontalScroller({
  children,
  className,
  rows = 1,
}: {
  children: React.ReactNode
  className?: string
  /**
   * Rows to stack on phones before scrolling sideways. `2` reads fuller on a
   * narrow screen where a single row shows only a card or two; it collapses to
   * one row from sm up. Desktop is always one row.
   */
  rows?: 1 | 2
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // A sub-pixel slack: browsers don't always land exactly on 0 or on
  // scrollWidth, so an exact comparison can leave an arrow live at the very end.
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 1)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // Recheck when the strip resizes (viewport change, cards laying out) so the
    // "is there more that way" answer stays current.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  const nudge = (direction: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="group/scroller relative">
      <div
        ref={ref}
        className={cn(
          'snap-x snap-mandatory gap-6 overflow-x-auto pb-1',
          // Two rows on phones (grid flowing down columns), one row — a flex
          // strip — from sm up. `sm:flex` wins over `grid` at the breakpoint.
          rows === 2 ? 'grid grid-flow-col grid-rows-2 sm:flex' : 'flex',
          // No visible scrollbar — the peeking card and the arrows are the cue.
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>

      {([-1, 1] as const).map((direction) => {
        const active = direction === -1 ? canLeft : canRight
        return (
          <button
            key={direction}
            type="button"
            aria-label={direction === -1 ? 'Scroll left' : 'Scroll right'}
            onClick={() => nudge(direction)}
            disabled={!active}
            className={cn(
              // Pink fill with black icon (§9 — white on pink fails AA), square,
              // desktop only. Half opacity at rest so both read as present.
              'focus-visible:ring-ring bg-primary text-primary-foreground absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center opacity-50 transition-opacity focus-visible:ring-2 focus-visible:outline-none md:flex',
              // Active: brighten to full when the reader is over the row or tabs
              // to it. Inactive (nothing that way): locked at half and inert.
              active
                ? 'cursor-pointer group-hover/scroller:opacity-100 focus-visible:opacity-100'
                : 'cursor-default',
              direction === -1 ? 'left-0' : 'right-0',
            )}
          >
            {direction === -1 ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </button>
        )
      })}
    </div>
  )
}

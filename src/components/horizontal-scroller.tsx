'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A single horizontally-scrolling row, with snap and hover-revealed arrows.
 *
 * The cards render on the server and are handed in as children; this owns only
 * the scroll behaviour, so nothing about the content ships as client logic. The
 * partial card at the trailing edge is the affordance — it says "there's more"
 * without a visible scrollbar. Touch users swipe; the arrows are a desktop
 * convenience.
 */
export function HorizontalScroller({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const nudge = (direction: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="group/scroller relative">
      <div
        ref={ref}
        className={cn(
          'flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1',
          // No visible scrollbar — the peeking card and the arrows are the cue.
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>

      {([-1, 1] as const).map((direction) => (
        <button
          key={direction}
          type="button"
          aria-label={direction === -1 ? 'Scroll left' : 'Scroll right'}
          onClick={() => nudge(direction)}
          className={cn(
            'focus-visible:ring-ring border-border bg-background/90 text-foreground absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center border opacity-0 backdrop-blur transition-opacity group-hover/scroller:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none md:flex',
            direction === -1 ? 'left-0' : 'right-0',
          )}
        >
          {direction === -1 ? (
            <ChevronLeft className="size-5" />
          ) : (
            <ChevronRight className="size-5" />
          )}
        </button>
      ))}
    </div>
  )
}

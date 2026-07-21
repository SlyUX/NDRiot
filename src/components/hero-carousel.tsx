'use client'

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Auto-advancing carousel for the homepage hero.
 *
 * Slides arrive fully rendered from the server, so nothing here fetches or
 * knows what a book is. It owns an index, a timer and the controls.
 *
 * Layout: every slide occupies the same grid cell, so the container is as
 * tall as the tallest slide and never resizes on advance. No measuring, and
 * it stays correct when the viewport or the copy changes.
 *
 * Accessibility, which autoplay makes load-bearing rather than optional:
 *
 *  - A visible pause control. WCAG 2.2.2 requires content that moves for more
 *    than five seconds to be pausable, stoppable or hideable, and a hover
 *    handler is not a mechanism a keyboard user can reach.
 *  - Advancing stops on hover and on focus-within, so it cannot pull a slide
 *    away mid-read or mid-tab.
 *  - `prefers-reduced-motion` disables both the timer and the fade. Motion
 *    sensitivity is exactly what that setting is for.
 *  - Inactive slides get `inert`, which removes them from the tab order and
 *    the accessibility tree. Fading with opacity alone would leave their
 *    links focusable but invisible — a keyboard trap in all but name.
 *  - The live region falls silent while auto-advancing. Announcing a change
 *    every five seconds is noise, not information; it speaks only when the
 *    reader caused the change.
 */

const INTERVAL_MS = 5000
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Subscribes to the OS motion preference.
 *
 * useSyncExternalStore rather than useEffect + setState: matchMedia is an
 * external store, and reading one into state inside an effect is both a lint
 * error and a real tearing hazard. The third argument is the server snapshot —
 * false, because there is no media query to read during SSR, and assuming
 * "no preference" matches what the markup would render anyway.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}

export interface HeroCarouselProps {
  slides: ReactNode[]
  /** Accessible labels, one per slide. Announced on manual change. */
  labels: string[]
  className?: string
}

export function HeroCarousel({ slides, labels, className }: HeroCarouselProps) {
  const [index, setIndex] = useState(0)
  /** Whether the reader has pressed pause. Their stated preference. */
  const [playing, setPlaying] = useState(true)
  /** Transient pause from hover or focus. Not a stated preference. */
  const [held, setHeld] = useState(false)
  /** Suppresses the live region while the timer, not the reader, is driving. */
  const [autoAdvanced, setAutoAdvanced] = useState(false)

  const reducedMotion = usePrefersReducedMotion()
  const baseId = useId()
  const count = slides.length

  const go = useCallback(
    (next: number) => {
      setAutoAdvanced(false)
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  const advancing = playing && !held && !reducedMotion && count > 1

  useEffect(() => {
    if (!advancing) return
    const timer = setInterval(() => {
      setAutoAdvanced(true)
      setIndex((current) => (current + 1) % count)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [advancing, count])

  if (count === 0) return null
  if (count === 1) return <div className={className}>{slides[0]}</div>

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured"
      className={cn('relative', className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          go(index - 1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          go(index + 1)
        }
      }}
    >
      <div className="grid">
        {slides.map((slide, i) => {
          const active = i === index
          return (
            <div
              key={i}
              id={`${baseId}-slide-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${labels[i] ?? ''}`}
              inert={!active}
              className={cn(
                // Same cell for every slide — this is what holds the height.
                // `grid items-center` then centres each slide's content in
                // that cell, so shorter slides sit in the middle rather than
                // hugging the top.
                'col-start-1 row-start-1 grid items-center',
                'transition-opacity duration-500 motion-reduce:transition-none',
                active ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {slide}
            </div>
          )
        })}
      </div>

      <p aria-live={autoAdvanced ? 'off' : 'polite'} className="sr-only">
        {`Slide ${index + 1} of ${count}: ${labels[index] ?? ''}`}
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
        >
          <ChevronLeft />
        </Button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${labels[i] ?? ''}`}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'focus-visible:ring-ring size-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none',
                i === index ? 'bg-primary' : 'bg-white/35 hover:bg-white/60',
              )}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => go(index + 1)}
          aria-label="Next slide"
        >
          <ChevronRight />
        </Button>

        {/* Hidden when the OS has already asked for less motion — there is no
            timer running, so a pause button would be a lie. */}
        {!reducedMotion && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setPlaying((current) => !current)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
        )}
      </div>
    </div>
  )
}

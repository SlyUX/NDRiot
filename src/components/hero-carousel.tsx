'use client'

import { useCallback, useId, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Manual-advance carousel for the homepage hero.
 *
 * The only client component on the page, and it is deliberately dumb: slides
 * arrive fully rendered from the server, so nothing here fetches or knows what
 * a book is. It owns an index and the controls, nothing else.
 *
 * No autoplay, by decision. WCAG 2.2.2 requires any content that moves for
 * more than five seconds to be pausable, and the first slide carries the
 * pitch — sliding it away before someone finishes reading is the failure mode
 * carousels are notorious for.
 *
 * Inactive slides stay in the DOM (so the markup is crawlable) but are
 * `hidden`, which removes them from the accessibility tree and tab order.
 * Visually hiding them with opacity alone would leave their links focusable.
 */

export interface HeroCarouselProps {
  slides: ReactNode[]
  /** Accessible labels, one per slide. Announced on change. */
  labels: string[]
  className?: string
}

export function HeroCarousel({ slides, labels, className }: HeroCarouselProps) {
  const [index, setIndex] = useState(0)
  const baseId = useId()
  const count = slides.length

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  )

  if (count === 0) return null

  // A single slide needs no controls, no roledescription, and no live region.
  if (count === 1) {
    return <div className={className}>{slides[0]}</div>
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured"
      className={cn('relative', className)}
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
      {slides.map((slide, i) => (
        <div
          key={i}
          id={`${baseId}-slide-${i}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${count}: ${labels[i] ?? ''}`}
          hidden={i !== index}
        >
          {slide}
        </div>
      ))}

      {/* Announces the change for screen reader users, who otherwise get no
          signal that pressing a dot did anything. */}
      <p aria-live="polite" className="sr-only">
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
      </div>
    </div>
  )
}

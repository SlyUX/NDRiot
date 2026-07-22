'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Visible, explicit filtering — the interface for AGENTS.md §3.
 *
 * Everything is on screen. No dropdowns, no "advanced" panel: a hidden
 * control implies the site decided, and the whole point is that the reader
 * did. Active state is legible at a glance and clearable in one click.
 *
 * State lives in the URL rather than in the component. That makes a filtered
 * view shareable — a creator can link to their own genre — keeps the listing
 * server-rendered, and means the saved filters planned for V2 are just saved
 * URLs rather than a new storage model.
 */

export interface Facet {
  /** URL parameter name. */
  param: string
  label: string
  options: readonly string[]
  /** Several values at once. Genre is; format and audience are not. */
  multi?: boolean
  /** A flag rather than a value — present or absent, no options. */
  toggle?: boolean
}

export interface FilterBarProps {
  facets: Facet[]
  /** Announced with the result count, so the change is not silent. */
  resultCount: number
  className?: string
}

export function FilterBar({ facets, resultCount, className }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const active = facets.flatMap((facet) =>
    searchParams.getAll(facet.param).map((value) => ({ facet, value })),
  )

  const apply = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString()
      // scroll: false — the filters sit above the results, and jumping to the
      // top of the page on every toggle loses your place in the row you are
      // reading.
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const toggle = useCallback(
    (facet: Facet, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      const current = next.getAll(facet.param)

      if (current.includes(value)) {
        next.delete(facet.param)
        // Multi-select keeps the others; single-select had only this one.
        if (facet.multi) {
          for (const v of current.filter((c) => c !== value)) next.append(facet.param, v)
        }
      } else if (facet.multi) {
        next.append(facet.param, value)
      } else {
        next.set(facet.param, value)
      }

      apply(next)
    },
    [apply, searchParams],
  )

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString())
    for (const facet of facets) next.delete(facet.param)
    apply(next)
  }, [apply, facets, searchParams])

  return (
    <div className={cn('space-y-4', className)}>
      {facets.map((facet) => {
        const selected = searchParams.getAll(facet.param)

        return (
          <fieldset key={facet.param} className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <legend className="sr-only">{facet.label}</legend>
            <span
              aria-hidden="true"
              className="text-muted-foreground w-24 shrink-0 text-[10px] tracking-widest uppercase"
            >
              {facet.label}
            </span>

            <div className="flex flex-wrap gap-1.5">
              {(facet.toggle ? ['Yes'] : facet.options).map((option) => {
                const value = facet.toggle ? '1' : option
                const isOn = selected.includes(value)

                return (
                  <button
                    key={option}
                    type="button"
                    // aria-pressed, not aria-checked: these are toggle buttons
                    // rather than form controls, and each one acts immediately.
                    aria-pressed={isOn}
                    onClick={() => toggle(facet, value)}
                    className={cn(
                      'focus-visible:ring-ring border px-2.5 py-1 text-[11px] tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      isOn
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'text-muted-foreground hover:border-primary/60 hover:text-foreground border-white/20',
                    )}
                  >
                    {facet.toggle ? facet.label : option}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}

      {active.length > 0 && (
        <div className="flex items-center gap-3 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            <X className="mr-1 size-3.5" />
            Clear {active.length} filter{active.length === 1 ? '' : 's'}
          </Button>
        </div>
      )}

      {/* Filtering navigates, so the result set changes without anything being
          announced. This says what happened. */}
      <p aria-live="polite" className="sr-only">
        {active.length === 0
          ? `Showing all ${resultCount} results.`
          : `${resultCount} result${resultCount === 1 ? '' : 's'} for ${active
              .map((a) => a.value)
              .join(', ')}.`}
      </p>
    </div>
  )
}

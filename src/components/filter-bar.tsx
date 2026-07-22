'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

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
  /**
   * `chips` exposes every option at once — the listing pages, where browsing
   * is the task. `select` collapses each facet to a dropdown for the
   * homepage, where the filter is a way in rather than the main event.
   *
   * Multi-select is ignored under `select`: a native multiple-select is
   * genuinely awful to use, and the homepage version is deliberately the
   * simpler one.
   */
  control?: 'chips' | 'select'
  /** Announced with the result count, so the change is not silent. */
  resultCount: number
  /** Placeholder for the search box. Copy, so it comes from Sanity. */
  searchLabel: string
  className?: string
}

/** Long enough that typing a word is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 300

export function FilterBar({
  facets,
  resultCount,
  searchLabel,
  control = 'chips',
  className,
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlQuery = searchParams.get('q') ?? ''
  const [term, setTerm] = useState(urlQuery)

  const active = [
    ...facets.flatMap((facet) =>
      searchParams.getAll(facet.param).map((value) => ({ facet, value })),
    ),
    ...(urlQuery ? [{ facet: null, value: urlQuery }] : []),
  ]

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

  /** Sets or clears one value. Used by the dropdowns. */
  const setValue = useCallback(
    (facet: Facet, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      next.delete(facet.param)
      if (value) next.append(facet.param, value)
      apply(next)
    },
    [apply, searchParams],
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

  /**
   * Pushes the search term after a pause, so a typed word is one navigation
   * rather than one per character.
   *
   * The input keeps its own state and is seeded from the URL once. A back
   * button that changes `q` therefore restores the results but leaves the box
   * showing what was last typed — syncing it would need either a remount,
   * which steals focus mid-typing, or focus tracking, which is more machinery
   * than the mismatch costs.
   */
  useEffect(() => {
    if (term === urlQuery) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString())
      if (term) next.set('q', term)
      else next.delete('q')
      apply(next)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, urlQuery, searchParams, apply])

  const clearAll = useCallback(() => {
    setTerm('')
    const next = new URLSearchParams(searchParams.toString())
    for (const facet of facets) next.delete(facet.param)
    // Clear means clear — leaving the search term behind would look broken.
    next.delete('q')
    apply(next)
  }, [apply, facets, searchParams])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          // A visible placeholder is not a label — the input needs a name of
          // its own for anyone who cannot see it.
          aria-label={searchLabel}
          placeholder={searchLabel}
          className="focus-visible:ring-ring placeholder:text-muted-foreground w-full border border-white/20 bg-transparent py-2 pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      {control === 'select' && (
        <div className="flex flex-wrap gap-2">
          {facets.map((facet) => {
            const selected = searchParams.get(facet.param) ?? ''
            const options = facet.toggle ? ['1'] : facet.options

            return (
              <select
                key={facet.param}
                value={selected}
                aria-label={facet.label}
                onChange={(event) => setValue(facet, event.target.value)}
                className={cn(
                  'focus-visible:ring-ring border bg-transparent px-2.5 py-2 text-[11px] tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none',
                  selected
                    ? 'border-primary text-primary font-bold'
                    : 'text-muted-foreground border-white/20',
                )}
              >
                {/* The empty option is "no filter", not a value — naming it
                    after the facet keeps the dropdown legible when closed. */}
                <option value="" className="bg-background text-foreground">
                  {facet.label}: Any
                </option>
                {options.map((option) => (
                  <option
                    key={option}
                    value={facet.toggle ? '1' : option}
                    className="bg-background text-foreground"
                  >
                    {facet.toggle ? facet.label : option}
                  </option>
                ))}
              </select>
            )
          })}
        </div>
      )}

      {control === 'chips' &&
        facets.map((facet) => {
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

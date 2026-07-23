'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Search, Shuffle, X } from 'lucide-react'

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
 *
 * The URL keys are configurable (searchParam/sortParam/seedParam) so two bars
 * can sit on one page without fighting over `q`/`sort`/`seed` — the homepage
 * runs a comics bar and a separate creators bar, each filtering only its own
 * row.
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
  /**
   * Hide the facets behind a toggle, collapsed by default. For the listing
   * pages, where the full chip grid is tall and most visitors browse before
   * they narrow. Active filters and the clear button stay visible even when
   * collapsed, so §3's "legible active state" holds — only the controls fold
   * away, never the fact that a filter is on.
   */
  collapsible?: boolean
  /** Announced with the result count, so the change is not silent. */
  resultCount: number
  /** Placeholder for the search box. Copy, so it comes from Sanity. */
  searchLabel: string
  /** Label for the randomise button. Omit to hide it. */
  discoverLabel?: string
  /**
   * URL keys this bar owns. Defaults suit a page with one bar; the homepage
   * gives its creators bar a distinct set so it never touches the comics row.
   */
  searchParam?: string
  sortParam?: string
  seedParam?: string
  className?: string
}

/** Long enough that typing a word is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 300

export function FilterBar({
  facets,
  resultCount,
  searchLabel,
  discoverLabel,
  control = 'chips',
  collapsible = false,
  searchParam = 'q',
  sortParam = 'sort',
  seedParam = 'seed',
  className,
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlQuery = searchParams.get(searchParam) ?? ''
  const [term, setTerm] = useState(urlQuery)

  // Collapsed by default when collapsible; always open otherwise.
  const [open, setOpen] = useState(!collapsible)
  const panelId = useId()

  const activeFacetCount = facets.reduce(
    (sum, facet) => sum + searchParams.getAll(facet.param).length,
    0,
  )

  const active = [
    ...facets.flatMap((facet) =>
      searchParams.getAll(facet.param).map((value) => ({ facet, value })),
    ),
    ...(urlQuery ? [{ facet: null, value: urlQuery }] : []),
    ...(searchParams.get(sortParam) === 'random'
      ? [{ facet: null, value: 'shuffled' }]
      : []),
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
   * button that changes the search key therefore restores the results but
   * leaves the box showing what was last typed — syncing it would need either
   * a remount, which steals focus mid-typing, or focus tracking, which is more
   * machinery than the mismatch costs.
   */
  useEffect(() => {
    if (term === urlQuery) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString())
      if (term) next.set(searchParam, term)
      else next.delete(searchParam)
      apply(next)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, urlQuery, searchParams, apply, searchParam])

  const isRandom = searchParams.get(sortParam) === 'random'

  /**
   * Re-seeds on every press, so pressing it again reshuffles rather than
   * doing nothing — pushing an identical URL renders nothing new.
   *
   * Pressing it while already on shuffles again; there is no "off". Clearing
   * the filters restores the default order.
   */
  const discover = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set(sortParam, 'random')
    next.set(seedParam, String(Math.floor(Math.random() * 1_000_000)))
    apply(next)
  }, [apply, searchParams, sortParam, seedParam])

  const clearAll = useCallback(() => {
    setTerm('')
    const next = new URLSearchParams(searchParams.toString())
    for (const facet of facets) next.delete(facet.param)
    // Clear means clear — leaving the search term or a shuffle behind would
    // look broken.
    next.delete(searchParam)
    next.delete(sortParam)
    next.delete(seedParam)
    apply(next)
  }, [apply, facets, searchParams, searchParam, sortParam, seedParam])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and the dropdowns share a row under `select`, and stack under
          `chips` where the facets need the full width. */}
      <div className={cn(control === 'select' && 'flex flex-wrap items-center gap-2')}>
      <div className="relative w-full max-w-xs">
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
        <>
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
                  // pr-8, not pr-2.5: a native select draws its caret inside
                  // the padding box, so symmetric padding leaves the arrow
                  // jammed against the right border.
                  'focus-visible:ring-ring border bg-transparent py-2 pr-8 pl-2.5 text-[11px] tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none',
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

          {discoverLabel && (
          <button
            type="button"
            onClick={discover}
            aria-pressed={isRandom}
            className={cn(
              'focus-visible:ring-ring border px-3 py-2 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none',
              isRandom
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:border-primary/60 hover:text-foreground border-white/20',
            )}
          >
            <Shuffle aria-hidden="true" className="mr-1.5 inline size-3.5" />
            {discoverLabel}
          </button>
          )}
        </>
      )}
      </div>

      {/* Toggle for the collapsible chip grid. Shows the active count so a
          collapsed panel still tells you a filter is on. */}
      {control === 'chips' && collapsible && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="focus-visible:ring-ring text-foreground/80 hover:text-foreground flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
          Filters
          {activeFacetCount > 0 && <span className="text-primary">({activeFacetCount})</span>}
        </button>
      )}

      {control === 'chips' && (
        <div id={panelId} hidden={collapsible && !open} className="space-y-4">
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
        </div>
      )}

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

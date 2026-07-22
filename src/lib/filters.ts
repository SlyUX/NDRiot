import type { Facet } from '@/components/filter-bar'
import { FORMATS, GENRES, MATURITY_RATINGS } from '@/lib/taxonomy'

/**
 * Turning URL search params into GROQ parameters.
 *
 * Absent means `null`, never `undefined` — the filtered queries test with
 * `!defined($x)`, and GROQ treats an undefined parameter as an error rather
 * than as "no filter".
 */

export type SearchParams = Record<string, string | string[] | undefined>

/** Several values for one key, however the framework handed them over. */
function many(value: string | string[] | undefined): string[] | null {
  if (!value) return null
  const list = (Array.isArray(value) ? value : [value]).filter(Boolean)
  return list.length ? list : null
}

/** One value. An array in the URL takes the first rather than erroring. */
function one(value: string | string[] | undefined): string | null {
  const list = many(value)
  return list ? list[0] : null
}

/**
 * Only values the taxonomy knows about survive.
 *
 * A hand-typed `?genre=Cyberpunk` should show everything, not nothing — a
 * filter for a genre that does not exist is a typo, and answering a typo with
 * an empty page is a dead end for no reason.
 */
function allowed<T extends readonly string[]>(values: string[] | null, list: T): string[] | null {
  if (!values) return null
  const kept = values.filter((v) => (list as readonly string[]).includes(v))
  return kept.length ? kept : null
}

export const BOOK_FACETS: Facet[] = [
  { param: 'genre', label: 'Genre', options: GENRES, multi: true },
  { param: 'format', label: 'Format', options: FORMATS },
  { param: 'audience', label: 'Audience', options: MATURITY_RATINGS },
  { param: 'status', label: 'Status', options: ['Ongoing', 'Complete', 'Upcoming'] },
]

export const CREATOR_FACETS: Facet[] = [
  { param: 'genre', label: 'Genre', options: GENRES, multi: true },
  { param: 'format', label: 'Makes', options: FORMATS },
  { param: 'audience', label: 'Audience', options: MATURITY_RATINGS },
  { param: 'collaborating', label: 'Open to collaboration', options: [], toggle: true },
]

export function bookFilters(params: SearchParams) {
  return {
    genres: allowed(many(params.genre), GENRES),
    format: allowed(many(params.format), FORMATS)?.[0] ?? null,
    maturity: allowed(many(params.audience), MATURITY_RATINGS)?.[0] ?? null,
    status: allowed(many(params.status), ['Ongoing', 'Complete', 'Upcoming'])?.[0] ?? null,
  }
}

export function creatorFilters(params: SearchParams) {
  return {
    genres: allowed(many(params.genre), GENRES),
    format: allowed(many(params.format), FORMATS)?.[0] ?? null,
    audience: allowed(many(params.audience), MATURITY_RATINGS)?.[0] ?? null,
    // A flag: present means "only those open to it". Absent means everyone,
    // not "only those who said no".
    collaborating: one(params.collaborating) ? true : null,
  }
}

/** True when anything is actually narrowing the results. */
export function hasActiveFilters(filters: Record<string, unknown>): boolean {
  return Object.values(filters).some((v) => v !== null)
}

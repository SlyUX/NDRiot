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

/**
 * The homepage set — only facets that mean the same thing on a book and on a
 * creator, since one row filters both sections at once.
 *
 * Status is books-only and open-to-collaboration is creators-only, so neither
 * belongs here: a control that silently applies to half the page is worse
 * than one fewer control.
 */
export const HOME_FACETS: Facet[] = [
  { param: 'genre', label: 'Genre', options: GENRES },
  { param: 'format', label: 'Format', options: FORMATS },
  { param: 'audience', label: 'Audience', options: MATURITY_RATINGS },
]

export const CREATOR_FACETS: Facet[] = [
  { param: 'genre', label: 'Genre', options: GENRES, multi: true },
  { param: 'format', label: 'Makes', options: FORMATS },
  { param: 'audience', label: 'Audience', options: MATURITY_RATINGS },
  { param: 'collaborating', label: 'Open to collaboration', options: [], toggle: true },
]

/**
 * Turns a typed phrase into a GROQ `match` pattern.
 *
 * A trailing `*` makes it prefix-matching, so results narrow as someone
 * types rather than only landing on a whole word. GROQ tokenises, so "scar
 * tis" matches "Scar Tissue" — but "issue" will not match "Tissue", because
 * matching is per token and not a substring scan. That is the expected
 * behaviour for a title search and worth knowing before it looks like a bug.
 *
 * Characters with meaning to GROQ are stripped rather than escaped: a stray
 * quote in a search box should find nothing surprising, not error.
 */
export function searchTerm(value: string | string[] | undefined): string | null {
  const raw = one(value)?.trim()
  if (!raw) return null
  const cleaned = raw.replace(/["'*\\]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned ? `${cleaned}*` : null
}

export function bookFilters(params: SearchParams) {
  return {
    genres: allowed(many(params.genre), GENRES),
    format: allowed(many(params.format), FORMATS)?.[0] ?? null,
    maturity: allowed(many(params.audience), MATURITY_RATINGS)?.[0] ?? null,
    status: allowed(many(params.status), ['Ongoing', 'Complete', 'Upcoming'])?.[0] ?? null,
    q: searchTerm(params.q),
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
    q: searchTerm(params.q),
  }
}

/**
 * Deterministic shuffle, seeded from the URL.
 *
 * Seeded rather than freely random so a Discover result is stable: refreshing
 * or sharing the link gives the same arrangement, which a per-request shuffle
 * would not. It also makes the button work twice — a new seed is a new URL,
 * where re-pushing the same one would render nothing new.
 *
 * mulberry32: small, fast, and good enough for arranging a page. Not for
 * anything where predictability matters.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The seed from the URL, or null when Discover is not active. */
export function discoverSeed(params: SearchParams): number | null {
  if (one(params.sort) !== 'random') return null
  const raw = Number.parseInt(one(params.seed) ?? '', 10)
  return Number.isFinite(raw) ? raw : 1
}

/** True when anything is actually narrowing the results. */
export function hasActiveFilters(filters: Record<string, unknown>): boolean {
  return Object.values(filters).some((v) => v !== null)
}

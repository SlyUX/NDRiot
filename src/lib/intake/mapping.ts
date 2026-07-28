/**
 * Pure text → schema helpers for native intake.
 *
 * Ported from scripts/lib/shared.mjs and import-creators.mjs so the on-site
 * forms and the CSV importer produce byte-identical documents — any divergence
 * here silently corrupts data (AGENTS.md §8), so this logic is copied, not
 * reinvented. Two deliberate drops for the browser context:
 *
 * - `repairText` (Latin-1 mojibake repair) is gone: it exists for CSV re-decode
 *   artefacts, and native form input is already UTF-8.
 * - The taxonomy lists are imported directly from `@/lib/taxonomy` rather than
 *   parsed out of its source at runtime (the scripts' `readList`), so they can
 *   never drift from the canonical constants.
 *
 * Everything here is pure and Node-free (no `Buffer`), so it is safe to import
 * from anywhere. The Sanity writes and image uploads that DO need the token
 * live behind the server-only boundary, in the action.
 */

/** A Portable Text block, minimally shaped for a plain-text bio. */
export type PortableTextBlock = {
  _type: 'block'
  _key: string
  style: 'normal'
  markDefs: never[]
  children: { _type: 'span'; _key: string; text: string; marks: never[] }[]
}

/**
 * Slug from free text, capped at 96 chars. Apostrophes are deleted (not
 * spaced) so "Bobby's Super Squad" → bobbys-super-squad, not bobby-s-...;
 * every other punctuation mark separates words. Both straight and curly
 * apostrophes, since form input carries both.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

/** Plain text to Portable Text, one block per non-empty line. */
export function toPortableText(text: string): PortableTextBlock[] {
  return text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({
      _type: 'block' as const,
      _key: `b${i}`,
      style: 'normal' as const,
      markDefs: [],
      children: [{ _type: 'span' as const, _key: `s${i}`, text: line, marks: [] }],
    }))
}

/** Yes/no parser — a leading word "yes", case-insensitive. */
export const isYes = (value: string | null | undefined): boolean =>
  /^yes\b/i.test((value ?? '').trim())

/**
 * Normalise and match an answer against a canonical taxonomy list.
 *
 * Accepts a native multi-checkbox array (what `FormData.getAll` returns), a
 * single value, or a comma-joined string (the CSV shape). `single: true` never
 * splits on commas — an audience label's description can contain them. Form
 * labels carry their description after an em-dash (`Label — description`); only
 * the label is matched. Returns canonical-cased values from `allowed`, plus any
 * unknowns for the caller to surface rather than silently drop.
 */
export function matchTaxonomy(
  answer: string | string[] | null | undefined,
  allowed: readonly string[],
  { single = false }: { single?: boolean } = {},
): { matched: string[]; unknown: string[] } {
  const matched: string[] = []
  const unknown: string[] = []
  const candidates = Array.isArray(answer)
    ? answer
    : single
      ? [answer ?? '']
      : (answer ?? '').split(',')
  for (const raw of candidates) {
    // Form labels carry their description after an em-dash; take the label.
    const value = raw.split('—')[0].trim()
    if (!value) continue
    const hit = allowed.find((a) => a.toLowerCase() === value.toLowerCase())
    if (hit) matched.push(hit)
    else unknown.push(value)
  }
  return { matched, unknown }
}

/** Host → social platform name, matching the importer's PLATFORM_BY_HOST. */
const PLATFORM_BY_HOST: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(x|twitter)\.com$/, 'X'],
  [/(^|\.)bsky\.(app|social)$/, 'Bluesky'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
]

function platformFor(url: string): string {
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return 'Website'
  }
  return PLATFORM_BY_HOST.find(([re]) => re.test(host))?.[1] ?? 'Website'
}

export type SocialLink = { _type: 'socialLink'; _key: string; platform: string; url: string }

/** One URL per line (or comma-separated); non-URLs dropped. */
export function parseSocials(text: string): SocialLink[] {
  return (text ?? '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s))
    .map((url, i) => ({ _type: 'socialLink' as const, _key: `s${i}`, platform: platformFor(url), url }))
}

export type WorkLink = { _type: 'workLink'; _key: string; label: string; url: string }

/** One "Title  https://url" per line; lines without a URL are dropped, and a
 *  line that is only a URL uses the URL as its own label. */
export function parseWorks(text: string): WorkLink[] {
  return (text ?? '')
    .split(/\n+/)
    .map((line) => line.match(/^(.*?)\s*(https?:\/\/\S+)\s*$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m, i) => ({ _type: 'workLink' as const, _key: `w${i}`, label: m[1].trim() || m[2], url: m[2] }))
}

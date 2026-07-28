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

import { SOCIAL_PROFILE_PREFIX, type SocialPlatform } from '@/lib/taxonomy'

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

/**
 * Validate and normalize a URL. Adds a scheme when missing, then requires a
 * real host — a dot followed by a TLD-like ending — so a bare "https://www."
 * (the field's prefill left untouched) is rejected rather than stored. Returns
 * the cleaned URL, or null when there's nothing valid.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  let v = (raw ?? '').trim()
  if (!v) return null
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`
  let host: string
  try {
    host = new URL(v).hostname
  } catch {
    return null
  }
  if (!/\.[a-z]{2,}$/i.test(host)) return null
  return v
}

export type SocialLink = { _type: 'socialLink'; _key: string; platform: string; url: string }

/**
 * Build social links from parallel "platform" and "value" columns. For a
 * platform with a known profile prefix the value is an account name, stored as
 * prefix + handle (a leading @ and any pasted path stripped). For the rest
 * (Discord/Website/Other) the value is a full URL. A row needs a valid platform
 * and a non-empty result.
 */
export function buildSocials(
  platforms: string[],
  valuesIn: string[],
  allowed: readonly string[],
): SocialLink[] {
  const out: SocialLink[] = []
  const rows = Math.max(platforms.length, valuesIn.length)
  for (let r = 0; r < rows; r += 1) {
    const platform = (platforms[r] ?? '').trim()
    const raw = (valuesIn[r] ?? '').trim()
    if (!allowed.includes(platform) || !raw) continue

    const prefix = SOCIAL_PROFILE_PREFIX[platform as SocialPlatform]
    let url: string | null
    if (prefix) {
      // Keep just the handle: drop a leading @ and anything up to a last slash
      // (so a pasted profile URL still resolves to the account name).
      let handle = raw.replace(/^@+/, '')
      const slash = handle.lastIndexOf('/')
      if (slash >= 0) handle = handle.slice(slash + 1)
      handle = handle.trim()
      url = handle ? `${prefix}${handle}` : null
    } else {
      url = normalizeUrl(raw)
    }
    if (!url) continue
    out.push({ _type: 'socialLink', _key: `s${out.length}`, platform, url })
  }
  return out
}

export type WorkLink = { _type: 'workLink'; _key: string; label: string; url: string }

/**
 * Build work links from parallel "platform name" and "URL" columns — the two
 * inputs the form now collects per row. A row is kept only if it has a URL
 * (a scheme is added when missing); a blank platform name falls back to the URL
 * as its own label. Rows are zipped by index, so the arrays stay aligned.
 */
export function buildWorks(labels: string[], urls: string[]): WorkLink[] {
  const out: WorkLink[] = []
  const rows = Math.max(labels.length, urls.length)
  for (let r = 0; r < rows; r += 1) {
    const url = normalizeUrl(urls[r])
    if (!url) continue
    const label = (labels[r] ?? '').trim()
    out.push({ _type: 'workLink', _key: `w${out.length}`, label: label || url, url })
  }
  return out
}

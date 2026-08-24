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

import { SOCIAL_PROFILE_PREFIX, linkKindForHost, type SocialPlatform } from '@/lib/taxonomy'
import { youtubeId } from '@/components/video-embed'

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
      // Keep just the handle: drop a leading @, drop trailing slashes (canonical
      // profile URLs like instagram.com/name/ carry one), then anything up to a
      // last slash so a pasted profile URL still resolves to the account name.
      let handle = raw.replace(/^@+/, '').replace(/\/+$/, '')
      const slash = handle.lastIndexOf('/')
      if (slash >= 0) handle = handle.slice(slash + 1)
      // Restrict to characters real handles use, so nothing odd ends up in the
      // constructed URL. Covers Bluesky's dotted handles too.
      handle = handle.trim().replace(/[^A-Za-z0-9._-]/g, '')
      url = handle ? `${prefix}${handle}` : null
    } else {
      url = normalizeUrl(raw)
    }
    if (!url) continue
    out.push({ _type: 'socialLink', _key: `s${out.length}`, platform, url })
  }
  return out
}

export type BookLink = {
  _type: 'bookLink'
  _key: string
  kind: string
  label: string
  url: string
  endDate?: string
}

export type BookVideo = {
  _type: 'bookVideo'
  _key: string
  title: string
  url: string
}

/**
 * Zip the parallel title/URL arrays from the intake form's Videos rows into
 * `bookVideo` items. Keeps only YouTube-recognizable URLs (nothing else embeds)
 * that also carry a label; drops the rest silently.
 */
export function buildVideos(titles: string[], urls: string[]): BookVideo[] {
  const out: BookVideo[] = []
  const rows = Math.max(titles.length, urls.length)
  for (let r = 0; r < rows; r += 1) {
    const url = normalizeUrl(urls[r])
    if (!url || !youtubeId(url)) continue
    const title = (titles[r] ?? '').trim()
    if (!title) continue
    out.push({
      _type: 'bookVideo',
      _key: `video${out.length}`,
      title: title.slice(0, 60),
      url,
    })
  }
  return out
}

/**
 * Common host → friendly display name, so a pasted `a.co` link reads "Amazon",
 * not "a.co". Unknown hosts fall back to the cleaned host itself.
 */
const STORE_NAMES: Record<string, string> = {
  "a.co": "Amazon",
  "amzn.to": "Amazon",
  "amazon.com": "Amazon",
  "gumroad.com": "Gumroad",
  "itch.io": "itch.io",
  "kickstarter.com": "Kickstarter",
  "indiegogo.com": "Indiegogo",
  "backerkit.com": "BackerKit",
  "webtoons.com": "Webtoon",
  "tapas.io": "Tapas",
  "patreon.com": "Patreon",
  "ko-fi.com": "Ko-fi",
  "bandcamp.com": "Bandcamp",
  "bigcartel.com": "Big Cartel",
  "globalcomix.com": "GlobalComix",
  "drivethrucomics.com": "DriveThruComics",
  "substack.com": "Substack",
  "etsy.com": "Etsy",
};

/** A reader-friendly display name derived from a link's URL. */
function labelFromUrl(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
  if (STORE_NAMES[host]) return STORE_NAMES[host];
  // Amazon regional domains (amazon.co.uk, amazon.de, …).
  if (/(^|\.)amazon\./.test(host)) return "Amazon";
  return host;
}

/**
 * True when a typed label is really a URL fragment (`https`, `a.co`, a path…),
 * so we should ignore it and derive a clean name from the URL instead. A real
 * label ("Signed copies", "Free PDF") never matches — it has spaces or no
 * domain-like shape — so intentional names are always kept.
 */
function looksLikeUrl(label: string): boolean {
  const l = label.trim().toLowerCase();
  if (!l) return true;
  if (/^https?:?\/?\/?/.test(l)) return true; // http, https, https://, http:/
  if (l.includes("://") || l.includes("/")) return true;
  // A bare domain like a.co / gumroad.com: no spaces, dotted, letter TLD.
  if (!l.includes(" ") && /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(l))
    return true;
  return false;
}

/** The display label for a link row: keep a real typed name; otherwise (blank
 *  or a URL fragment) derive a friendly name from the URL. */
export function displayLabel(typed: string, url: string): string {
  const t = (typed ?? "").trim();
  return looksLikeUrl(t) ? labelFromUrl(url) : t;
}

/**
 * Build a book's links from parallel kind / label / URL / end-date columns —
 * the rows the form collects. A row needs a valid URL; the kind falls back to a
 * host guess then to "Buy" (the importer's rule) if the submitted one isn't in
 * `allowedKinds`; the label is what readers see — a real typed name is kept, a
 * blank or a pasted URL fragment becomes a friendly name from the link (a.co →
 * "Amazon"); an end date is kept only on a `Back` campaign and only if it's a
 * real ISO date (what an <input type=date> yields).
 */
export function buildLinks(
  kinds: string[],
  labels: string[],
  urls: string[],
  endDates: string[],
  allowedKinds: readonly string[],
): BookLink[] {
  const out: BookLink[] = []
  const rows = Math.max(kinds.length, urls.length)
  for (let r = 0; r < rows; r += 1) {
    const url = normalizeUrl(urls[r])
    if (!url) continue
    const submitted = (kinds[r] ?? '').trim()
    const kind = allowedKinds.includes(submitted) ? submitted : (linkKindForHost(url) ?? 'Buy')
    const link: BookLink = {
      _type: 'bookLink',
      _key: `link${out.length}`,
      kind,
      label: displayLabel(labels[r] ?? '', url),
      url,
    }
    if (kind === 'Back') {
      const d = (endDates[r] ?? '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) link.endDate = d
    }
    out.push(link)
  }
  return out
}

export type MediaLink = { _type: 'mediaLink'; _key: string; label: string; url: string }

/** Build a media outlet's links from parallel label / URL columns; blank label
 *  becomes the host. Same shape as buildWorks, different `_type`. */
export function buildMediaLinks(labels: string[], urls: string[]): MediaLink[] {
  const out: MediaLink[] = []
  const rows = Math.max(labels.length, urls.length)
  for (let r = 0; r < rows; r += 1) {
    const url = normalizeUrl(urls[r])
    if (!url) continue
    out.push({ _type: 'mediaLink', _key: `link${out.length}`, label: displayLabel(labels[r] ?? '', url), url })
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
    out.push({ _type: 'workLink', _key: `w${out.length}`, label: displayLabel(labels[r] ?? '', url), url })
  }
  return out
}

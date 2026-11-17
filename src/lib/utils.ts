import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Guard a stored URL before using it as a link `href`: only http(s) and mailto
 * pass; anything else (e.g. a `javascript:` URL) returns undefined, so the
 * anchor renders without an href rather than as an executable link.
 *
 * Defense-in-depth — on-site intake already validates URLs and Sanity's `url`
 * type validates in the Studio, but every externally-supplied link the site
 * renders goes through this so a bad value can never become a live link.
 */
export function externalHref(url: string | null | undefined): string | undefined {
  const value = (url ?? '').trim()
  return /^(https?:|mailto:)/i.test(value) ? value : undefined
}

/**
 * A plain-text preview capped at `max` characters, with an ellipsis when it
 * was actually cut — so the "…" means "there is more", not "this happens to
 * end here".
 *
 * Whitespace is collapsed first, because the source is usually flattened
 * Portable Text (pt::text joins blocks with newlines) and a preview wants one
 * clean line. The cut backs off to the last word boundary when that does not
 * lose too much, so a preview never ends mid-word.
 *
 * Returns undefined for empty input, so a caller can `&&` it away rather than
 * render an empty node.
 */
/**
 * The bare display host of a URL — the hostname without a leading `www.`, no
 * scheme and no path (e.g. "https://www.site.com/rss/" → "site.com"). Empty
 * string when the input isn't a valid absolute URL. Feeds the RSS block's
 * "Updates from {baseURL}" heading.
 */
export function hostLabel(raw: string | null | undefined): string {
  if (!raw) return ""
  try {
    return new URL(raw).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

export function truncate(text: string | null | undefined, max: number): string | undefined {
  if (!text) return undefined
  const clean = text.replace(/\s+/g, " ").trim()
  if (!clean) return undefined
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${body.trimEnd()}…`
}

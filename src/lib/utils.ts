import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

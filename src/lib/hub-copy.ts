/**
 * Fallback copy for a genre/format hub before an editor writes a hubPage doc.
 *
 * Functional, not final: the CMS intro / SEO fields replace these the moment
 * someone fills them in. Kept deliberately plain — one voice-neutral line — so
 * an unwritten hub still reads as a real page, not a stub.
 */

/** The hub's SEO/display title (before the "· ND Riot" brand suffix). */
export function hubTitle(kind: 'genre' | 'format', value: string): string {
  return kind === 'genre' ? `${value} Comics` : value
}

export function hubFallbackIntro(value: string): string {
  return `Real independent ${value.toLowerCase()} on ND Riot — the comics and the indie creators behind them. No gatekeepers, no big two.`
}

export function hubFallbackDescription(value: string): string {
  return `Discover independent ${value.toLowerCase()} comics and the creators making them on ND Riot — real work by real indie creators.`
}

import { formatDate } from "@/lib/card-mappers";

/**
 * Convention date helpers.
 *
 * Sanity `date` values are plain ISO calendar dates ("2026-07-31"), which sort
 * and compare correctly as strings — so "not past" is a lexical `>=` against
 * today (UTC, matching how card-mappers formats dates).
 */

/** Today as an ISO calendar date (YYYY-MM-DD), UTC. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * A stamped occurrence date is still active (upcoming / today), not past. A
 * missing date counts as active — an appearance marked before the con had dates
 * is "dates TBA", not expired.
 */
export function isUpcomingDate(
  date?: string | null,
  today: string = todayISO(),
): boolean {
  return !date || date >= today;
}

/**
 * Order a convention list upcoming-first (§3-safe — conventions are venues/
 * events, not ranked contributors, so date order is fair, not a leaderboard).
 *
 * Three bands: upcoming (soonest first) → dateless/recurring (kept in the
 * incoming order, usually alphabetical — "dates TBA", not expired) → past (most
 * recent first, so a con whose stamped occurrence has lapsed sinks but stays
 * listed as a real venue to browse/rate).
 */
export function orderConventionsUpcomingFirst<T extends { startDate?: string | null }>(
  conventions: T[],
  today: string = todayISO(),
): T[] {
  const upcoming: T[] = [];
  const undated: T[] = [];
  const past: T[] = [];
  for (const con of conventions) {
    if (!con.startDate) undated.push(con);
    else if (con.startDate >= today) upcoming.push(con);
    else past.push(con);
  }
  upcoming.sort((a, b) => (a.startDate as string).localeCompare(b.startDate as string));
  past.sort((a, b) => (b.startDate as string).localeCompare(a.startDate as string));
  return [...upcoming, ...undated, ...past];
}

/**
 * Filter an already-fetched convention list in JS — for the home row, whose
 * conventions are fetched whole (unlike the /conventions listing, which filters
 * in GROQ). `region` is a US-state code (exact match on place.region); `q` is a
 * plain substring over name + city. Empty options pass everything through.
 */
export function filterConventions<
  T extends {
    name?: string | null
    place?: { region?: string | null; city?: string | null } | null
  },
>(conventions: T[], opts: { region?: string | null; q?: string | null }): T[] {
  const region = opts.region ?? null
  const q = (opts.q ?? '').trim().toLowerCase()
  return conventions.filter((con) => {
    if (region && con.place?.region !== region) return false
    if (
      q &&
      !(con.name ?? '').toLowerCase().includes(q) &&
      !(con.place?.city ?? '').toLowerCase().includes(q)
    )
      return false
    return true
  })
}

/**
 * Display a con occurrence's dates: a single day, a range, or nothing.
 * "Jul 23, 2026" · "Jul 23 – 26, 2026"-ish (kept simple: full both ends).
 */
export function formatOccurrence(
  start?: string | null,
  end?: string | null,
): string | undefined {
  const s = formatDate(start);
  if (!s) return undefined;
  const e = formatDate(end);
  return e && e !== s ? `${s} – ${e}` : s;
}

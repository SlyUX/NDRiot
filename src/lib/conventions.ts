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

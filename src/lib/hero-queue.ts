import "server-only";

import { safeFetch, BOOK_IDS_QUERY, HERO_BOOKS_QUERY } from "@/lib/queries";
import type { HeroBook } from "@/lib/types";

/**
 * The hero spotlight is ND Riot's equal-odds surface (AGENTS.md §3): every book
 * has the same chance of the front page, and nothing is curated. The instant
 * "Spin the Rack" keeps that exact guarantee — it just draws a small queue of
 * uniform-random picks ahead of time so a spin is a client-side advance, not a
 * page reload. Each pick is a uniform draw from the FULL BOOK_IDS list, so no
 * book is ever excluded; the queue only batches the draws (and, as a bonus,
 * avoids an immediate repeat within a batch). The client refills it in the
 * background from /api/hero-queue, which calls straight back here.
 */

export interface HeroFeatureItem {
  book: HeroBook;
  /** Whether the signed-in reader has already saved this book. */
  saved: boolean;
  /** Whether this is the viewer's own comic (no Save on your own work). */
  own: boolean;
}

/**
 * `count` uniform-random books from the whole catalog, with full card data,
 * skipping any recently-shown ids. Falls back to allowing repeats only once the
 * catalog is exhausted (a tiny roster), never silently narrowing the pool.
 */
export async function pickHeroBooks(
  count: number,
  exclude: readonly string[] = [],
): Promise<HeroBook[]> {
  const ids = await safeFetch<string[]>(BOOK_IDS_QUERY, {}, []);
  if (ids.length === 0) return [];

  const excludeSet = new Set(exclude);
  const pool = ids.filter((id) => !excludeSet.has(id));
  // Everything was excluded (more spins than books) — draw from the full set
  // again rather than return nothing.
  const bag = pool.length > 0 ? pool : [...ids];

  const picked: string[] = [];
  for (let i = 0; i < count && bag.length > 0; i++) {
    const j = Math.floor(Math.random() * bag.length);
    picked.push(bag[j]);
    bag.splice(j, 1);
  }

  const books = await safeFetch<HeroBook[]>(
    HERO_BOOKS_QUERY,
    { ids: picked },
    [],
  );
  // `_id in $ids` doesn't preserve order — restore the drawn order.
  const byId = new Map(books.map((book) => [book._id, book]));
  return picked
    .map((id) => byId.get(id))
    .filter((book): book is HeroBook => Boolean(book));
}

/** Tag each hero book with this viewer's save/ownership state. */
export function annotateHeroItems(
  books: readonly HeroBook[],
  savedBookIds: ReadonlySet<string>,
  ownedCreatorIds: readonly string[],
): HeroFeatureItem[] {
  const owned = new Set(ownedCreatorIds);
  return books.map((book) => ({
    book,
    saved: savedBookIds.has(book._id),
    own: Boolean(book.creatorId && owned.has(book.creatorId)),
  }));
}

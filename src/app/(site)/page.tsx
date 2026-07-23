import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Hero } from '@/components/hero'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import {
  bookFilters,
  creatorHomeFilters,
  discoverSeed,
  hasActiveFilters,
  HOME_BOOK_FACETS,
  HOME_CREATOR_FACETS,
  seededShuffle,
  type SearchParams,
} from '@/lib/filters'
import {
  safeFetch,
  BOOK_IDS_QUERY,
  HERO_BOOKS_QUERY,
  FILTERED_BOOKS_QUERY,
  FILTERED_CREATORS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary, CreatorSummary, HeroBook } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Hero slides after the pitch. Three is what the carousel was built around. */
const HERO_SLOTS = 3

/**
 * Picks the books the hero will show.
 *
 * Random per request, not curated. Every book gets the same odds of the
 * homepage, which is the point: a directory that hand-picks its front page is
 * ranking its contributors, and this one deliberately does not.
 *
 * Two queries because GROQ has no random(). Fetching identifiers and then only
 * the chosen few keeps the cost flat as the roster grows — fetching every book
 * in full to shuffle three of them would not.
 */
async function pickHeroBooks(): Promise<HeroBook[]> {
  const ids = await safeFetch<string[]>(BOOK_IDS_QUERY, {}, [])
  if (ids.length === 0) return []

  // Fisher-Yates over a copy. Partial is fine — we only need the front.
  const pool = [...ids]
  const take = Math.min(HERO_SLOTS, pool.length)
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const chosen = pool.slice(0, take)
  const books = await safeFetch<HeroBook[]>(HERO_BOOKS_QUERY, { ids: chosen }, [])

  // `in $ids` does not preserve the order we asked for, so re-apply it —
  // otherwise the shuffle is undone by the query and the same book leads
  // every time.
  const order = new Map(chosen.map((id, i) => [id, i]))
  return books.sort((a, b) => (order.get(a._id) ?? 0) - (order.get(b._id) ?? 0))
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  /**
   * Two independent filter rows, one per section.
   *
   * The comics bar owns genre/format/audience/q; the creators bar owns the
   * c-prefixed keys. So narrowing comics no longer silently reorders the
   * creators row — each control sits above the row it governs and changes only
   * that row, which is the whole point of the split. Discover is per-row too
   * (sort/seed for comics, csort/cseed for creators), so one row can be
   * shuffled while the other holds still.
   */
  const booksFilters = bookFilters(params)
  const creatorsFilters = creatorHomeFilters(params)

  const booksFiltering = hasActiveFilters(booksFilters)
  const creatorsFiltering = hasActiveFilters(creatorsFilters)

  const bookSeed = discoverSeed(params, 'sort', 'seed')
  const creatorSeed = discoverSeed(params, 'csort', 'cseed')

  const [heroBooks, books, creators, settings] = await Promise.all([
    // Deliberately unfiltered. The hero is the guaranteed route to work
    // nobody went looking for (AGENTS.md §3), so narrowing the page must
    // never narrow it.
    pickHeroBooks(),
    safeFetch<BookSummary[]>(FILTERED_BOOKS_QUERY, booksFilters, []),
    safeFetch<CreatorSummary[]>(FILTERED_CREATORS_QUERY, creatorsFilters, []),
    getSiteSettings(),
  ])

  const booksBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={HOME_BOOK_FACETS}
        control="select"
        resultCount={books.length}
        searchLabel={settings.sections.searchBooksLabel}
        discoverLabel={settings.sections.discoverLabel}
      />
    </Suspense>
  )

  const creatorsBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={HOME_CREATOR_FACETS}
        control="select"
        resultCount={creators.length}
        searchLabel={settings.sections.searchCreatorsLabel}
        discoverLabel={settings.sections.discoverLabel}
        searchParam="cq"
        sortParam="csort"
        seedParam="cseed"
      />
    </Suspense>
  )

  return (
    <div>
      <Hero hero={settings.hero} books={heroBooks} />

      {/* Books: four across, opening two rows and revealing the next two on
          "view more" (so up to 16 are cut for). "View all" still links out to
          the full listing. */}
      <ContentCardGrid
        heading={settings.home.booksHeading}
        toolbar={booksBar}
        cards={(bookSeed === null ? books : seededShuffle(books, bookSeed)).slice(0, 16).map(bookToCard)}
        columns={4}
        initialRows={2}
        viewMoreLabel={settings.home.viewMoreLabel}
        padding="md"
        viewAllHref="/books"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={booksFiltering ? settings.empty.filteredBooks : settings.empty.books}
      />

      {/* Creators: wide horizontal cards, three across, each showing a bio
          preview. summaryLines=4 gives the ~160-character bio room the list-row
          default (2) would clip. Two rows open, up to two more on "view more". */}
      <ContentCardGrid
        heading={settings.home.creatorsHeading}
        toolbar={creatorsBar}
        cards={(creatorSeed === null ? creators : seededShuffle(creators, creatorSeed)).slice(0, 12).map(creatorToCard)}
        layout="horizontal"
        columns={3}
        summaryLines={4}
        initialRows={2}
        viewMoreLabel={settings.home.viewMoreLabel}
        padding="md"
        viewAllHref="/creators"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={creatorsFiltering ? settings.empty.filteredCreators : settings.empty.creators}
      />
    </div>
  )
}

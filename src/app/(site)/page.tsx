import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Hero } from '@/components/hero'
import { Section } from '@/components/ui/section'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import {
  bookFilters,
  creatorFilters,
  hasActiveFilters,
  HOME_FACETS,
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

  const booksFilters = bookFilters(params)
  /**
   * Search is comics-only on the homepage.
   *
   * The facets still narrow both sections — genre, format and audience mean
   * the same thing either side. But a title search should not empty the
   * makers row: someone typing a comic's name has not stopped being
   * interested in who else is here.
   *
   * The listing pages are unaffected; /creators searches creators, as it
   * should.
   */
  const makersFilters = { ...creatorFilters(params), q: null }

  const booksFiltering = hasActiveFilters(booksFilters)
  const makersFiltering = hasActiveFilters(makersFilters)

  const [heroBooks, books, creators, settings] = await Promise.all([
    // Deliberately unfiltered. The hero is the guaranteed route to work
    // nobody went looking for (AGENTS.md §3), so narrowing the page must
    // never narrow it.
    pickHeroBooks(),
    safeFetch<BookSummary[]>(FILTERED_BOOKS_QUERY, booksFilters, []),
    safeFetch<CreatorSummary[]>(FILTERED_CREATORS_QUERY, makersFilters, []),
    getSiteSettings(),
  ])

  return (
    <div>
      <Hero hero={settings.hero} books={heroBooks} />

      {/* Keeps its top padding — the gap below the hero is doing real work —
          but closes up underneath, so the filters and the rows they govern
          read as one group rather than three separate bands. */}
      <Section padding="md" className="pb-6">
        <Suspense fallback={null}>
          <FilterBar
            facets={HOME_FACETS}
            control="select"
            resultCount={books.length + creators.length}
            searchLabel={settings.sections.searchHomeLabel}
          />
        </Suspense>
      </Section>

      <ContentCardGrid
        heading={settings.home.booksHeading}
        cards={books.slice(0, 8).map(bookToCard)}
        columns={4}
        padding="tight"
        viewAllHref="/books"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={booksFiltering ? settings.empty.filteredBooks : settings.empty.books}
      />

      <ContentCardGrid
        heading={settings.home.creatorsHeading}
        cards={creators.slice(0, 8).map(creatorToCard)}
        columns={4}
        padding="tight"
        viewAllHref="/creators"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={makersFiltering ? settings.empty.filteredCreators : settings.empty.creators}
      />
    </div>
  )
}

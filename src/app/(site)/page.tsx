import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Hero } from '@/components/hero'
import { bookToCard, creatorToCard, editorialToCard } from '@/lib/card-mappers'
import {
  bookFilters,
  creatorHomeFilters,
  discoverSeed,
  genreOptions,
  hasActiveFilters,
  homeBookFacets,
  homeCreatorFacets,
  seededShuffle,
  type SearchParams,
} from '@/lib/filters'
import {
  safeFetch,
  BOOK_IDS_QUERY,
  GENRES_WITH_BOOKS_QUERY,
  HERO_BOOKS_QUERY,
  HOME_EDITORIAL_QUERY,
  HOME_NEW_QUERY,
  FILTERED_BOOKS_QUERY,
  FILTERED_CREATORS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type {
  BookSummary,
  CreatorSummary,
  HeroBook,
  HomeEditorial,
  HomeNewItem,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * One random book for the hero spotlight.
 *
 * Random per request, not curated. Every book gets the same odds of the front
 * page, which is the point (AGENTS.md §3): a directory that hand-picks its
 * spotlight is ranking its contributors, and this one deliberately does not.
 *
 * Two queries because GROQ has no random(): fetch identifiers, pick one, fetch
 * only that — cost stays flat as the roster grows.
 */
async function pickFeatureBook(): Promise<HeroBook | null> {
  const ids = await safeFetch<string[]>(BOOK_IDS_QUERY, {}, [])
  if (ids.length === 0) return null

  const id = ids[Math.floor(Math.random() * ids.length)]
  const [book] = await safeFetch<HeroBook[]>(HERO_BOOKS_QUERY, { ids: [id] }, [])
  return book ?? null
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

  const [feature, books, creators, genresWithBooks, newItems, homeEditorial, settings] =
    await Promise.all([
    // Deliberately unfiltered. The hero is the guaranteed route to work
    // nobody went looking for (AGENTS.md §3), so narrowing the page must
    // never narrow it.
    pickFeatureBook(),
    safeFetch<BookSummary[]>(FILTERED_BOOKS_QUERY, booksFilters, []),
    safeFetch<CreatorSummary[]>(FILTERED_CREATORS_QUERY, creatorsFilters, []),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
    safeFetch<HomeNewItem[]>(HOME_NEW_QUERY, {}, []),
    safeFetch<HomeEditorial[]>(HOME_EDITORIAL_QUERY, {}, []),
    getSiteSettings(),
  ])

  // Both rows offer the same genres — the set a book actually uses.
  const genres = genreOptions(genresWithBooks)

  const booksBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeBookFacets(genres)}
        control="select"
        collapsible
        resultCount={books.length}
        searchLabel={settings.sections.searchBooksLabel}
        discoverLabel={settings.sections.discoverLabel}
      />
    </Suspense>
  )

  const creatorsBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeCreatorFacets(genres)}
        control="select"
        collapsible
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
      <Hero hero={settings.hero} feature={feature} newItems={newItems} />

      {/* Books: four across, opening two rows and revealing the next two on
          "view more" (so up to 16 are cut for). "View all" still links out to
          the full listing. */}
      <ContentCardGrid
        heading={settings.home.booksHeading}
        toolbar={booksBar}
        cards={(bookSeed === null ? books : seededShuffle(books, bookSeed)).slice(0, 16).map(bookToCard)}
        columns={5}
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
        columns={4}
        summaryLines={4}
        initialRows={2}
        viewMoreLabel={settings.home.viewMoreLabel}
        padding="md"
        background="charcoal"
        viewAllHref="/creators"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={creatorsFiltering ? settings.empty.filteredCreators : settings.empty.creators}
      />

      {/* Editorial: one row of the most recent columns and interviews, wide
          horizontal cards with the 4:3 thumbnail. Hidden entirely when there is
          none, so the homepage never carries an empty editorial band. */}
      {homeEditorial.length > 0 && (
        <ContentCardGrid
          heading={settings.home.editorialHeading}
          cards={homeEditorial.slice(0, 4).map(editorialToCard)}
          layout="horizontal"
          columns={4}
          aspectRatio="landscape"
          summaryLines={3}
          padding="md"
          viewAllHref="/editorial"
          viewAllLabel={settings.home.viewAllLabel}
          emptyMessage=""
        />
      )}
    </div>
  )
}

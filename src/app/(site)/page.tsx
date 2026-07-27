import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Hero } from '@/components/hero'
import { LoadMore } from '@/components/load-more'
import { bookToCard, creatorToCard, editorialToCard } from '@/lib/card-mappers'
import {
  HOME_ROW_LIMIT,
  bookFilters,
  creatorHomeFilters,
  discoverSeed,
  genreOptions,
  hasActiveFilters,
  homeBookFacets,
  homeCreatorFacets,
  pageLimit,
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
  Paginated,
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

  // Browse shows a row's worth; a search on a row grows its own limit. Capped
  // either way, so a 1,000-book roster never lands in one homepage payload.
  // A search opens on two rows and grows a page (two rows) per "Load more".
  const BOOKS_COLS = 5
  const CREATORS_COLS = 4
  const booksPage = 2 * BOOKS_COLS
  const creatorsPage = 2 * CREATORS_COLS
  const booksLimit = booksFiltering ? pageLimit(params, 'blimit', booksPage) : HOME_ROW_LIMIT
  const creatorsLimit = creatorsFiltering
    ? pageLimit(params, 'climit', creatorsPage)
    : HOME_ROW_LIMIT

  const [feature, booksResult, creatorsResult, genresWithBooks, newItems, homeEditorial, settings] =
    await Promise.all([
      // Deliberately unfiltered. The hero is the guaranteed route to work
      // nobody went looking for (AGENTS.md §3), so narrowing the page must
      // never narrow it.
      pickFeatureBook(),
      safeFetch<Paginated<BookSummary>>(
        FILTERED_BOOKS_QUERY,
        { ...booksFilters, limit: booksLimit },
        { items: [], total: 0 },
      ),
      safeFetch<Paginated<CreatorSummary>>(
        FILTERED_CREATORS_QUERY,
        { ...creatorsFilters, limit: creatorsLimit },
        { items: [], total: 0 },
      ),
      safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
      safeFetch<HomeNewItem[]>(HOME_NEW_QUERY, {}, []),
      safeFetch<HomeEditorial[]>(HOME_EDITORIAL_QUERY, {}, []),
      getSiteSettings(),
    ])
  const books = booksResult.items
  const creators = creatorsResult.items

  // Both rows offer the same genres — the set a book actually uses.
  const genres = genreOptions(genresWithBooks)

  const booksBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeBookFacets(genres)}
        control="select"
        collapsible
        resultCount={booksResult.total}
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
        resultCount={creatorsResult.total}
        searchLabel={settings.sections.searchCreatorsLabel}
        discoverLabel={settings.sections.discoverLabel}
        searchParam="cq"
        sortParam="csort"
        seedParam="cseed"
      />
    </Suspense>
  )

  // Browsing shuffles when Discover is on; a search leaves the order alone so
  // Load More does not reshuffle the set under the reader.
  const displayBooks = booksFiltering
    ? books
    : bookSeed === null
      ? books
      : seededShuffle(books, bookSeed)
  const displayCreators = creatorsFiltering
    ? creators
    : creatorSeed === null
      ? creators
      : seededShuffle(creators, creatorSeed)

  return (
    <div>
      <Hero hero={settings.hero} feature={feature} newItems={newItems} />

      {/* Books: one scrolling row while browsing; a two-row grid with "Load
          more" once a search narrows it. "View all" links to the full listing. */}
      <ContentCardGrid
        heading={settings.home.booksHeading}
        toolbar={booksBar}
        cards={displayBooks.map(bookToCard)}
        columns={BOOKS_COLS}
        scroll={!booksFiltering}
        footer={
          booksFiltering ? (
            <LoadMore
              searchParams={params}
              param="blimit"
              shown={books.length}
              total={booksResult.total}
              pageSize={booksPage}
            />
          ) : undefined
        }
        padding="md"
        viewAllHref="/books"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={booksFiltering ? settings.empty.filteredBooks : settings.empty.books}
      />

      {/* Creators: wide horizontal cards. Same browse-scroll / search-grid split
          as the books row above. */}
      <ContentCardGrid
        heading={settings.home.creatorsHeading}
        toolbar={creatorsBar}
        cards={displayCreators.map(creatorToCard)}
        layout="horizontal"
        columns={CREATORS_COLS}
        summaryLines={4}
        scroll={!creatorsFiltering}
        footer={
          creatorsFiltering ? (
            <LoadMore
              searchParams={params}
              param="climit"
              shown={creators.length}
              total={creatorsResult.total}
              pageSize={creatorsPage}
            />
          ) : undefined
        }
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
          cards={homeEditorial.map(editorialToCard)}
          layout="horizontal"
          columns={4}
          aspectRatio="landscape"
          summaryLines={3}
          scroll
          padding="md"
          viewAllHref="/editorial"
          viewAllLabel={settings.home.viewAllLabel}
          emptyMessage=""
        />
      )}
    </div>
  )
}

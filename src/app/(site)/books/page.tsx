import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { LoadMore } from '@/components/load-more'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import {
  PAGE_SIZE,
  bookFacets,
  bookFilters,
  genreOptions,
  hasActiveFilters,
  pageLimit,
  type SearchParams,
} from '@/lib/filters'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, BOOKS_QUERY, FILTERED_BOOKS_QUERY, GENRES_WITH_BOOKS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary, Paginated } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  // Canonical is the bare /books — so the filter permutations (?genre=…&sort=…)
  // all fold into one ranking target rather than splitting it.
  return pageMetadata({
    title: settings.sections.booksHeading,
    description: settings.sections.booksDescription,
    path: '/books',
    siteTitle: settings.siteTitle,
    feeds: [{ url: '/feeds/comics.xml', title: settings.sections.booksHeading }],
  })
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const filters = bookFilters(params)
  const filtering = hasActiveFilters(filters)
  const limit = pageLimit(params)

  const [result, genresWithBooks, settings] = await Promise.all([
    safeFetch<Paginated<BookSummary>>(
      FILTERED_BOOKS_QUERY,
      { ...filters, limit },
      { items: [], total: 0 },
    ),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
    getSiteSettings(),
  ])
  const books = result.items

  // Only fetched when filtering emptied the page. An empty result is a
  // discovery moment, not an error (AGENTS.md §3) — so offer the rest of the
  // shelf rather than a dead end.
  const fallback =
    filtering && books.length === 0
      ? await safeFetch<BookSummary[]>(BOOKS_QUERY, {}, [])
      : []

  return (
    <div>
      {/* pb-6 here + pt-6 on the grid halves the gap between two `md` bands, so
          the filters and the results they govern read as one group rather than
          two stacked sections (AGENTS.md §3 — the filter is the interface). */}
      <Section as="header" padding="md" className="pb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.booksHeading}
        </h1>
        <Suspense fallback={null}>
          <FilterBar facets={bookFacets(genreOptions(genresWithBooks))} resultCount={result.total}
            searchLabel={settings.sections.searchBooksLabel}
            control="select"
            collapsible
            className="mt-8" />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={books.map(bookToCard)}
        columns={5}
        padding="md"
        className="pt-6"
        footer={
          <LoadMore
            searchParams={params}
            shown={books.length}
            total={result.total}
            pageSize={PAGE_SIZE}
          />
        }
        emptyMessage={
          filtering ? settings.empty.filteredBooks : settings.empty.books
        }
        emptyEmphasis={filtering}
      />

      {fallback.length > 0 && (
        <ContentCardGrid
          heading={settings.sections.everythingElseHeading}
          headingSize="sm"
          cards={fallback.slice(0, 8).map(bookToCard)}
          columns={5}
          padding="md"
          emptyMessage={settings.empty.books}
        />
      )}
    </div>
  )
}

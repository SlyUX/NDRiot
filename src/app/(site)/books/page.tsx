import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { bookFacets, bookFilters, genreOptions, hasActiveFilters, type SearchParams } from '@/lib/filters'
import { safeFetch, BOOKS_QUERY, FILTERED_BOOKS_QUERY, GENRES_WITH_BOOKS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const filters = bookFilters(params)
  const filtering = hasActiveFilters(filters)

  const [books, genresWithBooks, settings] = await Promise.all([
    safeFetch<BookSummary[]>(FILTERED_BOOKS_QUERY, filters, []),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
    getSiteSettings(),
  ])

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
          <FilterBar facets={bookFacets(genreOptions(genresWithBooks))} resultCount={books.length}
            searchLabel={settings.sections.searchBooksLabel}
            collapsible
            className="mt-8" />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={books.map(bookToCard)}
        columns={5}
        padding="md"
        className="pt-6"
        emptyMessage={
          filtering ? settings.empty.filteredBooks : settings.empty.books
        }
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

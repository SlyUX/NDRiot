import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { BOOK_FACETS, bookFilters, hasActiveFilters, type SearchParams } from '@/lib/filters'
import { safeFetch, BOOKS_QUERY, FILTERED_BOOKS_QUERY } from '@/lib/queries'
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

  const [books, settings] = await Promise.all([
    safeFetch<BookSummary[]>(FILTERED_BOOKS_QUERY, filters, []),
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
      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.booksHeading}
        </h1>
        <Suspense fallback={null}>
          <FilterBar facets={BOOK_FACETS} resultCount={books.length} className="mt-8" />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={books.map(bookToCard)}
        columns={4}
        padding="md"
        emptyMessage={
          filtering ? settings.empty.filteredBooks : settings.empty.books
        }
      />

      {fallback.length > 0 && (
        <ContentCardGrid
          heading={settings.sections.everythingElseHeading}
          headingSize="sm"
          cards={fallback.slice(0, 8).map(bookToCard)}
          columns={4}
          padding="md"
          emptyMessage={settings.empty.books}
        />
      )}
    </div>
  )
}

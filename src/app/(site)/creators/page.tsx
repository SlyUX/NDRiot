import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Section } from '@/components/ui/section'
import { creatorToCard } from '@/lib/card-mappers'
import { creatorFacets, creatorFilters, genreOptions, hasActiveFilters, type SearchParams } from '@/lib/filters'
import { safeFetch, CREATORS_QUERY, FILTERED_CREATORS_QUERY, GENRES_WITH_BOOKS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { CreatorSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const filters = creatorFilters(params)
  const filtering = hasActiveFilters(filters)

  const [creators, genresWithBooks, settings] = await Promise.all([
    safeFetch<CreatorSummary[]>(FILTERED_CREATORS_QUERY, filters, []),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
    getSiteSettings(),
  ])

  const fallback =
    filtering && creators.length === 0
      ? await safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, [])
      : []

  return (
    <div>
      {/* pb-6 + the grid's pt-6 halve the gap so the filters and their results
          read as one group — see the note on the books page. */}
      <Section as="header" padding="md" className="pb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.creatorsHeading}
        </h1>
        <Suspense fallback={null}>
          <FilterBar facets={creatorFacets(genreOptions(genresWithBooks))} resultCount={creators.length}
            searchLabel={settings.sections.searchCreatorsLabel}
            collapsible
            className="mt-8" />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={creators.map(creatorToCard)}
        layout="horizontal"
        columns={3}
        summaryLines={4}
        padding="md"
        className="pt-6"
        emptyMessage={
          filtering ? settings.empty.filteredCreators : settings.empty.creators
        }
      />

      {fallback.length > 0 && (
        <ContentCardGrid
          heading={settings.sections.everythingElseHeading}
          headingSize="sm"
          cards={fallback.slice(0, 8).map(creatorToCard)}
          layout="horizontal"
          columns={3}
          summaryLines={4}
          padding="md"
          emptyMessage={settings.empty.creators}
        />
      )}
    </div>
  )
}

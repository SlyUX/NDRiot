import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Section } from '@/components/ui/section'
import { creatorToCard } from '@/lib/card-mappers'
import { CREATOR_FACETS, creatorFilters, hasActiveFilters, type SearchParams } from '@/lib/filters'
import { safeFetch, CREATORS_QUERY, FILTERED_CREATORS_QUERY } from '@/lib/queries'
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

  const [creators, settings] = await Promise.all([
    safeFetch<CreatorSummary[]>(FILTERED_CREATORS_QUERY, filters, []),
    getSiteSettings(),
  ])

  const fallback =
    filtering && creators.length === 0
      ? await safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, [])
      : []

  return (
    <div>
      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.creatorsHeading}
        </h1>
        <Suspense fallback={null}>
          <FilterBar facets={CREATOR_FACETS} resultCount={creators.length}
            searchLabel={settings.sections.searchCreatorsLabel}
            className="mt-8" />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={creators.map(creatorToCard)}
        columns={4}
        padding="md"
        emptyMessage={
          filtering ? settings.empty.filteredCreators : settings.empty.creators
        }
      />

      {fallback.length > 0 && (
        <ContentCardGrid
          heading={settings.sections.everythingElseHeading}
          headingSize="sm"
          cards={fallback.slice(0, 8).map(creatorToCard)}
          columns={4}
          padding="md"
          emptyMessage={settings.empty.creators}
        />
      )}
    </div>
  )
}

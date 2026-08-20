import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Section } from '@/components/ui/section'
import { conventionToCard } from '@/lib/card-mappers'
import { orderConventionsUpcomingFirst } from '@/lib/conventions'
import {
  conventionFacets,
  conventionFilters,
  conventionRegionOptions,
  hasActiveFilters,
  type SearchParams,
} from '@/lib/filters'
import { pageMetadata } from '@/lib/page-metadata'
import {
  safeFetch,
  CONVENTIONS_QUERY,
  CONVENTION_REGIONS_QUERY,
  FILTERED_CONVENTIONS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { ConventionSummary } from '@/lib/types'

/**
 * Conventions — a directory of comics cons worth a creator's table.
 *
 * Ordered upcoming-first (§3-safe: a convention is a venue/event, not a ranked
 * contributor). Discovery is user-directed (§3): an explicit **State** filter,
 * always visible and clearable. (Profile-based "near me" is deferred until we
 * add real geolocation.) Creator ratings surface per convention on detail.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return pageMetadata({
    title: settings.sections.conventionsPageTitle,
    description: settings.sections.conventionsPageDescription,
    path: '/conventions',
    siteTitle: settings.siteTitle,
  })
}

export default async function ConventionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const [regionCodes, settings] = await Promise.all([
    safeFetch<string[]>(CONVENTION_REGIONS_QUERY, {}, []),
    getSiteSettings(),
  ])
  const { sections, empty } = settings

  // Discovery is user-directed (§3): an explicit State dropdown. (Profile-based
  // "near me" was removed for now — geolocation returns when we're further along.)
  const filters = conventionFilters(params)
  const filtering = hasActiveFilters(filters)
  const filtered = await safeFetch<ConventionSummary[]>(
    FILTERED_CONVENTIONS_QUERY,
    filters,
    [],
  )
  const conventions = orderConventionsUpcomingFirst(filtered)

  // Filtered into an empty result: offer everything upcoming instead of a dead
  // end (§3 — an empty result is a discovery moment).
  const fallback =
    filtering && conventions.length === 0
      ? orderConventionsUpcomingFirst(
          await safeFetch<ConventionSummary[]>(CONVENTIONS_QUERY, {}, []),
        )
      : []

  const facets = conventionFacets(conventionRegionOptions(regionCodes))

  return (
    <div>
      {/* pb-6 + the grid's pt-6 halve the gap so the filters and their results
          read as one group — matching the creators/books listings. */}
      <Section as="header" padding="md" className="pb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {sections.conventionsPageTitle}
        </h1>
        {sections.conventionsPageDescription && (
          <p className="text-muted-foreground mt-3 max-w-prose text-sm">
            {sections.conventionsPageDescription}
          </p>
        )}

        <Suspense fallback={null}>
          <FilterBar
            facets={facets}
            resultCount={conventions.length}
            searchLabel={sections.searchConventionsLabel}
            control="select"
            className="mt-6"
          />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={conventions.map((c) =>
          conventionToCard(c, sections.conventionRatingCardEmpty),
        )}
        layout="vertical"
        columns={4}
        aspectRatio="square"
        summaryLines={3}
        padding="md"
        className="pt-6"
        emptyMessage={filtering ? empty.filteredConventions : empty.conventions}
        emptyEmphasis={filtering}
      />

      {fallback.length > 0 && (
        <ContentCardGrid
          heading={sections.everythingElseHeading}
          headingSize="sm"
          cards={fallback
            .slice(0, 8)
            .map((c) => conventionToCard(c, sections.conventionRatingCardEmpty))}
          layout="vertical"
          columns={4}
          aspectRatio="square"
          summaryLines={3}
          padding="md"
          emptyMessage={empty.conventions}
        />
      )}
    </div>
  )
}

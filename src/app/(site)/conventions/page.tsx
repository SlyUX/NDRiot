import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { MapPin } from 'lucide-react'

import { auth } from '@/auth'
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
  stateName,
  type SearchParams,
} from '@/lib/filters'
import { pageMetadata } from '@/lib/page-metadata'
import {
  safeFetch,
  CONVENTIONS_QUERY,
  CONVENTION_REGIONS_QUERY,
  FILTERED_CONVENTIONS_QUERY,
  OWNED_CREATOR_REGION_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { ConventionSummary } from '@/lib/types'
import { creatorsOwnedBy } from '@/sanity/ownership-client'

/**
 * Conventions — a directory of comics cons worth a creator's table.
 *
 * Ordered upcoming-first (§3-safe: a convention is a venue/event, not a ranked
 * contributor). Discovery is user-directed (§3): an explicit **State** filter,
 * always visible and clearable. A signed-in creator who set a location gets a
 * one-tap "Near me" shortcut that pre-fills that same filter — teal, because it
 * is tuned to them (§9); the default view stays unfiltered, so nobody arrives
 * pre-narrowed. Creator ratings surface per convention on the detail page.
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
  const filters = conventionFilters(params)
  const filtering = hasActiveFilters(filters)

  const [regionCodes, filtered, settings, session] = await Promise.all([
    safeFetch<string[]>(CONVENTION_REGIONS_QUERY, {}, []),
    safeFetch<ConventionSummary[]>(FILTERED_CONVENTIONS_QUERY, filters, []),
    getSiteSettings(),
    auth(),
  ])
  const conventions = orderConventionsUpcomingFirst(filtered)
  const { sections, empty } = settings

  // "Near me" — a signed-in creator with a stored region, unless the list is
  // already filtered to it. Their own explicit data, offered as a one-tap
  // shortcut rather than applied silently (§3).
  const email = session?.user?.email ?? null
  let nearMe: { label: string; href: string } | null = null
  if (email) {
    const owned = await creatorsOwnedBy(email)
    if (owned.length) {
      const code = await safeFetch<string | null>(
        OWNED_CREATOR_REGION_QUERY,
        { id: owned[0] },
        null,
      )
      const name = stateName(code)
      if (name && filters.region !== code) {
        nearMe = {
          label: sections.conventionNearMeLabel.replace('{state}', name),
          href: `/conventions?region=${encodeURIComponent(name)}`,
        }
      }
    }
  }

  // Filtered into an empty result: offer everything upcoming instead of a dead
  // end (§3 — an empty result is a discovery moment).
  const fallback =
    filtering && conventions.length === 0
      ? orderConventionsUpcomingFirst(
          await safeFetch<ConventionSummary[]>(CONVENTIONS_QUERY, {}, []),
        )
      : []

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

        {nearMe && (
          <Link
            href={nearMe.href}
            className="bg-personalize text-personalize-foreground focus-visible:ring-ring mt-6 inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
          >
            <MapPin aria-hidden="true" className="size-3.5" />
            {nearMe.label}
          </Link>
        )}

        <Suspense fallback={null}>
          <FilterBar
            facets={conventionFacets(conventionRegionOptions(regionCodes))}
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

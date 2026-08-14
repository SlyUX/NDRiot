import type { Metadata } from 'next'

import { ContentCardGrid } from '@/components/content-card-grid'
import { conventionToCard } from '@/lib/card-mappers'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, CONVENTIONS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { ConventionSummary } from '@/lib/types'

/**
 * Conventions — a directory of comics cons worth a creator's table. Listed
 * alphabetically (neutral order, §3): a convention is a venue being reviewed,
 * not a contributor, and nothing here is ordered by rating. Creator ratings
 * arrive in a later phase; this is the browse-and-link foundation.
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

export default async function ConventionsPage() {
  const [conventions, settings] = await Promise.all([
    safeFetch<ConventionSummary[]>(CONVENTIONS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <ContentCardGrid
      headingAs="h1"
      headingSize="lg"
      heading={settings.sections.conventionsPageTitle}
      subtitle={settings.sections.conventionsPageDescription}
      cards={conventions.map(conventionToCard)}
      layout="vertical"
      columns={4}
      aspectRatio="square"
      summaryLines={3}
      padding="md"
      emptyMessage={settings.empty.conventions}
    />
  )
}

import type { Metadata } from 'next'

import { ContentCardGrid } from '@/components/content-card-grid'
import { ResourceList } from '@/components/resource-list'
import { Section } from '@/components/ui/section'
import { downloadToCard } from '@/lib/card-mappers'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, DOWNLOADS_QUERY, RESOURCES_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { DownloadSummary, ResourceSummary } from '@/lib/types'

/**
 * Downloads & Resources — the home for free downloads (creator-shared files)
 * and outbound resources (hosting, tools, community, funding). Replaces the old
 * /editorial listing; editorials are hidden for now (their detail pages remain).
 * /editorial and /downloads redirect here (next.config); the download detail
 * pages still live at /downloads/[slug].
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return pageMetadata({
    title: settings.sections.resourcesPageTitle,
    description: settings.sections.resourcesPageDescription,
    path: '/resources',
    siteTitle: settings.siteTitle,
  })
}

export default async function ResourcesPage() {
  const [downloads, resources, settings] = await Promise.all([
    safeFetch<DownloadSummary[]>(DOWNLOADS_QUERY, {}, []),
    safeFetch<ResourceSummary[]>(RESOURCES_QUERY, {}, []),
    getSiteSettings(),
  ])
  const s = settings.sections

  return (
    <div>
      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {s.resourcesPageTitle}
        </h1>
      </Section>

      {/* Anchor targets for the nav dropdown; scroll-mt clears the sticky header. */}
      <div id="downloads" className="scroll-mt-24">
        <ContentCardGrid
          heading={s.downloadsHeading}
          headingSize="sm"
          cards={downloads.map(downloadToCard)}
          layout="horizontal"
          columns={3}
          padding="md"
          emptyMessage={settings.empty.downloads}
        />
      </div>

      <div id="resources" className="scroll-mt-24">
        <ResourceList
          heading={s.resourcesHeading}
          resources={resources}
          emptyMessage={settings.empty.resources}
        />
      </div>
    </div>
  )
}

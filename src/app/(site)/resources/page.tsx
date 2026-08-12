import type { Metadata } from 'next'

import { ResourceList } from '@/components/resource-list'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, RESOURCES_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { ResourceSummary } from '@/lib/types'

/**
 * Resources — help for indie creators and readers (videos, files, links, and
 * guides), each with its own page at /resources/[slug]. Replaces the old
 * /editorial listing; /editorial and /downloads redirect here.
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
  const [resources, settings] = await Promise.all([
    safeFetch<ResourceSummary[]>(RESOURCES_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <ResourceList
      headingAs="h1"
      headingSize="lg"
      heading={settings.sections.resourcesPageTitle}
      resources={resources}
      emptyMessage={settings.empty.resources}
    />
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { ResourceList } from '@/components/resource-list'
import { Section } from '@/components/ui/section'
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
    <>
      <ResourceList
        headingAs="h1"
        headingSize="lg"
        heading={settings.sections.resourcesPageTitle}
        resources={resources}
        emptyMessage={settings.empty.resources}
      />
      {/* Conventions are their own directory but belong to the "help for
          creators" family, so we point to them from here too. */}
      <Section padding="md" className="pt-0">
        <Link
          href="/conventions"
          className="text-primary hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 text-sm font-black tracking-widest uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {settings.sections.conventionsResourcesLinkLabel}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </Section>
    </>
  )
}

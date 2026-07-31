import type { Metadata } from 'next'

import { ContentCardGrid } from '@/components/content-card-grid'
import { Section } from '@/components/ui/section'
import { columnToCard, interviewToCard } from '@/lib/card-mappers'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, COLUMNS_QUERY, INTERVIEWS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { ColumnSummary, InterviewSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return pageMetadata({
    title: settings.sections.editorialHeading,
    description: settings.sections.editorialDescription,
    path: '/editorial',
    siteTitle: settings.siteTitle,
  })
}

export default async function EditorialPage() {
  const [columns, interviews, settings] = await Promise.all([
    safeFetch<ColumnSummary[]>(COLUMNS_QUERY, {}, []),
    safeFetch<InterviewSummary[]>(INTERVIEWS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <div>
      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.editorialHeading}
        </h1>
      </Section>

      {/* Anchor targets for the Editorial nav dropdown (Columns / Interviews).
          scroll-mt keeps the heading clear of the top edge on jump. */}
      <div id="columns" className="scroll-mt-24">
        <ContentCardGrid
          heading={settings.sections.columnsHeading}
          headingSize="sm"
          cards={columns.map(columnToCard)}
          layout="horizontal"
          aspectRatio="landscape"
          columns={3}
          padding="md"
          emptyMessage={settings.empty.columns}
        />
      </div>

      <div id="interviews" className="scroll-mt-24">
        <ContentCardGrid
          heading={settings.sections.interviewsHeading}
          headingSize="sm"
          cards={interviews.map(interviewToCard)}
          layout="horizontal"
          aspectRatio="landscape"
          columns={3}
          padding="md"
          emptyMessage={settings.empty.interviews}
        />
      </div>
    </div>
  )
}

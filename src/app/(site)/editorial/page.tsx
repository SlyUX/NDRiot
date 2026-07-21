import { ContentCardGrid } from '@/components/content-card-grid'
import { Section } from '@/components/ui/section'
import { columnToCard, interviewToCard } from '@/lib/card-mappers'
import { safeFetch, COLUMNS_QUERY, INTERVIEWS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { ColumnSummary, InterviewSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditorialPage() {
  const [columns, interviews, settings] = await Promise.all([
    safeFetch<ColumnSummary[]>(COLUMNS_QUERY, {}, []),
    safeFetch<InterviewSummary[]>(INTERVIEWS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <div>
      <Section as="header" padding="none" maxWidth="full">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.editorialHeading}
        </h1>
      </Section>

      <ContentCardGrid
        heading={settings.sections.columnsHeading}
        headingSize="sm"
        cards={columns.map(columnToCard)}
        layout="horizontal"
        aspectRatio="video"
        columns={2}
        padding="md"
        maxWidth="full"
        emptyMessage={settings.empty.columns}
      />

      <ContentCardGrid
        heading={settings.sections.interviewsHeading}
        headingSize="sm"
        cards={interviews.map(interviewToCard)}
        layout="horizontal"
        aspectRatio="video"
        columns={2}
        padding="md"
        maxWidth="full"
        emptyMessage={settings.empty.interviews}
      />
    </div>
  )
}

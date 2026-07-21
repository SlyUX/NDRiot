import { ContentCardGrid } from '@/components/content-card-grid'
import { Section } from '@/components/ui/section'
import { columnToCard, interviewToCard } from '@/lib/card-mappers'
import { safeFetch, COLUMNS_QUERY, INTERVIEWS_QUERY } from '@/lib/queries'
import { siteCopy } from '@/lib/site-copy'
import type { ColumnSummary, InterviewSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditorialPage() {
  const [columns, interviews] = await Promise.all([
    safeFetch<ColumnSummary[]>(COLUMNS_QUERY, {}, []),
    safeFetch<InterviewSummary[]>(INTERVIEWS_QUERY, {}, []),
  ])

  return (
    <div>
      <Section as="header" padding="none" maxWidth="full">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {siteCopy.editorial.heading}
        </h1>
      </Section>

      <ContentCardGrid
        heading={siteCopy.editorial.columnsHeading}
        headingSize="sm"
        cards={columns.map(columnToCard)}
        layout="horizontal"
        aspectRatio="video"
        columns={2}
        padding="md"
        maxWidth="full"
        emptyMessage={siteCopy.empty.columns}
      />

      <ContentCardGrid
        heading={siteCopy.editorial.interviewsHeading}
        headingSize="sm"
        cards={interviews.map(interviewToCard)}
        layout="horizontal"
        aspectRatio="video"
        columns={2}
        padding="md"
        maxWidth="full"
        emptyMessage={siteCopy.empty.interviews}
      />
    </div>
  )
}

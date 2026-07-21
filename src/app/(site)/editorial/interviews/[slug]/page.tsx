import { notFound } from 'next/navigation'

import { Section } from '@/components/ui/section'

import PortableTextBody from '@/components/PortableTextBody'
import { formatDate } from '@/lib/card-mappers'
import { safeFetch, INTERVIEW_QUERY } from '@/lib/queries'
import type { InterviewDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function InterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const interview = await safeFetch<InterviewDetail | null>(INTERVIEW_QUERY, { slug }, null)

  if (!interview) notFound()

  const published = formatDate(interview.publishedAt)

  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tighter uppercase">{interview.title}</h1>
        {interview.interviewerName && interview.subjectName && (
          <p className="text-primary text-xs tracking-wide uppercase">
            {interview.interviewerName} interviews {interview.subjectName}
          </p>
        )}
        {published && interview.publishedAt && (
          <time dateTime={interview.publishedAt} className="text-muted-foreground text-xs">
            {published}
          </time>
        )}
      </header>
      <PortableTextBody value={interview.body} />
    </Section>
  )
}

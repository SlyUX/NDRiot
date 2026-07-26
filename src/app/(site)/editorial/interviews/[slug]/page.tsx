import Image from 'next/image'
import { notFound } from 'next/navigation'

import { ContentCard } from '@/components/content-card'
import PortableTextBody from '@/components/PortableTextBody'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { creatorRefToCard, formatDate } from '@/lib/card-mappers'
import { safeFetch, INTERVIEW_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { InterviewDetail } from '@/lib/types'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export default async function InterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [interview, settings] = await Promise.all([
    safeFetch<InterviewDetail | null>(INTERVIEW_QUERY, { slug }, null),
    getSiteSettings(),
  ])

  if (!interview) notFound()

  const published = formatDate(interview.publishedAt)
  // The interviewer is the piece's author. The subject is the person featured
  // on the card and in the byline, so the foot credits the writer.
  const authorCard = creatorRefToCard(interview.interviewer)

  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-6">
      {/* Header image, when the piece has one — 16:9 to match the card thumbnail
          it shares. Decorative here: the title sits right below it. */}
      {interview.cover && (
        <div className="bg-muted relative aspect-video overflow-hidden">
          <Image
            src={urlFor(interview.cover).width(1200).url()}
            alt={interview.cover.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      )}

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

      {/* The interviewer, credited as a card at the foot — reusing the same
          framed creator card the book page uses. */}
      {authorCard && (
        <div>
          <SectionHeading as="h3" size="sm">
            {settings.sections.editorialAuthorHeading}
          </SectionHeading>
          <div className="border-border border p-[15px]">
            <ContentCard {...authorCard} layout="horizontal" summaryLines={4} />
          </div>
        </div>
      )}
    </Section>
  )
}

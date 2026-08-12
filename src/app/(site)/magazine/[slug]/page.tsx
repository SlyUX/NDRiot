import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RagIssueView } from '@/components/rag-issue-view'
import { Section } from '@/components/ui/section'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, RAG_ISSUE_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { RagIssueDetail } from '@/lib/types'

/** A single Rag issue — the featured layout on its own page. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [issue, settings] = await Promise.all([
    safeFetch<RagIssueDetail | null>(RAG_ISSUE_QUERY, { slug }, null),
    getSiteSettings(),
  ])
  if (!issue) return {}
  return pageMetadata({
    title: `${settings.sections.ragPageTitle} · Issue ${issue.issueNumber}`,
    description: issue.description ?? undefined,
    path: `/magazine/${slug}`,
    siteTitle: settings.siteTitle,
  })
}

export default async function RagIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [issue, settings] = await Promise.all([
    safeFetch<RagIssueDetail | null>(RAG_ISSUE_QUERY, { slug }, null),
    getSiteSettings(),
  ])
  if (!issue) notFound()

  const s = settings.sections
  return (
    <Section padding="md" maxWidth="3xl">
      <RagIssueView
        issue={issue}
        headingAs="h1"
        labels={{
          read: s.ragReadLabel,
          download: s.ragDownloadLabel,
          buyHeading: s.ragBuyHeading,
          tocHeading: s.ragTocHeading,
          creditsHeading: s.ragCreditsHeading,
        }}
      />
    </Section>
  )
}

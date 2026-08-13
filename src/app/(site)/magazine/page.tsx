import type { Metadata } from 'next'

import { ContentCardGrid } from '@/components/content-card-grid'
import { RagIssueView } from '@/components/rag-issue-view'
import { Section } from '@/components/ui/section'
import { ragIssueToCard } from '@/lib/card-mappers'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, RAG_ISSUES_QUERY, RAG_LATEST_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { RagIssueDetail, RagIssueSummary } from '@/lib/types'

/**
 * The ND Riot Rag — our magazine. The newest issue is featured in full; older
 * issues are a cover archive below, each linking to its own page. An issue's PDF
 * reads online or downloads free; other editions ride the buy links.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return pageMetadata({
    title: settings.sections.ragPageTitle,
    description: settings.sections.ragPageDescription,
    path: '/magazine',
    siteTitle: settings.siteTitle,
  })
}

export default async function MagazinePage() {
  const [latest, issues, settings] = await Promise.all([
    safeFetch<RagIssueDetail | null>(RAG_LATEST_QUERY, {}, null),
    safeFetch<RagIssueSummary[]>(RAG_ISSUES_QUERY, {}, []),
    getSiteSettings(),
  ])
  const s = settings.sections
  const labels = {
    read: s.ragReadLabel,
    download: s.ragDownloadLabel,
    buyHeading: s.ragBuyHeading,
    tocHeading: s.ragTocHeading,
    contributorsHeading: s.ragContributorsHeading,
  }
  // Archive = every issue except the one featured up top.
  const archive = latest ? issues.filter((issue) => issue._id !== latest._id) : issues

  return (
    <div>
      <Section as="header" padding="md" maxWidth="3xl">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">{s.ragPageTitle}</h1>
      </Section>

      <Section padding="md" maxWidth="3xl">
        {latest ? (
          <RagIssueView issue={latest} labels={labels} headingAs="h2" />
        ) : (
          <p className="text-muted-foreground text-sm">{settings.empty.ragIssues}</p>
        )}
      </Section>

      {archive.length > 0 && (
        <ContentCardGrid
          heading={s.ragArchiveHeading}
          headingSize="sm"
          cards={archive.map(ragIssueToCard)}
          columns={4}
          padding="md"
          maxWidth="3xl"
          emptyMessage=""
        />
      )}
    </div>
  )
}

import { ContentCardGrid } from '@/components/content-card-grid'
import { downloadToCard } from '@/lib/card-mappers'
import { safeFetch, DOWNLOADS_QUERY } from '@/lib/queries'
import { siteCopy } from '@/lib/site-copy'
import type { DownloadSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DownloadsPage() {
  const downloads = await safeFetch<DownloadSummary[]>(DOWNLOADS_QUERY, {}, [])

  return (
    <ContentCardGrid
      heading={siteCopy.downloads.heading}
      headingAs="h1"
      headingSize="lg"
      cards={downloads.map(downloadToCard)}
      layout="horizontal"
      columns={2}
      padding="none"
      maxWidth="full"
      emptyMessage={siteCopy.empty.downloads}
    />
  )
}

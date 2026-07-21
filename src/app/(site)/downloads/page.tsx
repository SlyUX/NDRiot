import { ContentCardGrid } from '@/components/content-card-grid'
import { downloadToCard } from '@/lib/card-mappers'
import { safeFetch, DOWNLOADS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { DownloadSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DownloadsPage() {
  const [downloads, settings] = await Promise.all([
    safeFetch<DownloadSummary[]>(DOWNLOADS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <ContentCardGrid
      heading={settings.sections.downloadsHeading}
      headingAs="h1"
      headingSize="lg"
      cards={downloads.map(downloadToCard)}
      layout="horizontal"
      columns={2}
      emptyMessage={settings.empty.downloads}
    />
  )
}

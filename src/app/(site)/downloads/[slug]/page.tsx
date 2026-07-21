import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { safeFetch, DOWNLOAD_QUERY } from '@/lib/queries'
import { siteCopy } from '@/lib/site-copy'
import type { DownloadDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DownloadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const download = await safeFetch<DownloadDetail | null>(DOWNLOAD_QUERY, { slug }, null)

  if (!download) notFound()

  return (
    <article className="space-y-5">
      <h1 className="text-3xl font-black tracking-tighter uppercase">{download.title}</h1>
      {download.creatorName && (
        <p className="text-primary text-xs tracking-wide uppercase">{download.creatorName}</p>
      )}
      {download.description && (
        <p className="text-muted-foreground">{download.description}</p>
      )}
      {download.fileUrl && (
        <Button asChild>
          <a href={download.fileUrl} target="_blank" rel="noopener noreferrer">
            {siteCopy.downloads.cta}
          </a>
        </Button>
      )}
    </article>
  )
}

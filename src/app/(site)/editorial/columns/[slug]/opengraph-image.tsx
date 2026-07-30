import { ImageResponse } from 'next/og'

import { OgCard } from '@/components/og-card'
import { logoDataUri, ogFonts, ogImageUrl, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og'
import { safeFetch, COLUMN_QUERY } from '@/lib/queries'
import type { ColumnDetail } from '@/lib/types'

export const alt = 'A column on ND Riot'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [column, logoUrl, fonts] = await Promise.all([
    safeFetch<ColumnDetail | null>(COLUMN_QUERY, { slug }, null),
    logoDataUri(),
    ogFonts(),
  ])

  if (!column) {
    return new ImageResponse(<OgCard title="Not found" logoUrl={logoUrl} />, { ...size, fonts })
  }

  return new ImageResponse(
    (
      <OgCard
        eyebrow={column.authorName ?? 'Column'}
        title={column.title}
        imageUrl={column.cover ? ogImageUrl(column.cover, 600, 900) : null}
        logoUrl={logoUrl}
      />
    ),
    { ...size, fonts },
  )
}

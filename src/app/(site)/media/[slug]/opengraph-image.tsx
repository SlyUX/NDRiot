import { ImageResponse } from 'next/og'

import { OgCard } from '@/components/og-card'
import { logoDataUri, ogFonts, ogImageUrl, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og'
import { safeFetch, MEDIA_DETAIL_QUERY } from '@/lib/queries'
import type { MediaDetail } from '@/lib/types'

export const alt = 'A media outlet on ND Riot'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [media, logoUrl, fonts] = await Promise.all([
    safeFetch<MediaDetail | null>(MEDIA_DETAIL_QUERY, { slug }, null),
    logoDataUri(),
    ogFonts(),
  ])

  if (!media) {
    return new ImageResponse(<OgCard title="Not found" logoUrl={logoUrl} />, { ...size, fonts })
  }

  return new ImageResponse(
    (
      <OgCard
        eyebrow={media.kinds?.length ? media.kinds.join(' · ') : null}
        title={media.name}
        imageUrl={media.logo ? ogImageUrl(media.logo, 600, 600) : null}
        imageShape="square"
        logoUrl={logoUrl}
      />
    ),
    { ...size, fonts },
  )
}

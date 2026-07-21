import { ImageResponse } from 'next/og'

import { OgCard } from '@/components/og-card'
import { logoDataUri, ogFonts, ogImageUrl, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og'
import { safeFetch, CREATOR_QUERY } from '@/lib/queries'
import type { CreatorDetail } from '@/lib/types'

export const alt = 'A creator on ND Riot'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [creator, logoUrl, fonts] = await Promise.all([
    safeFetch<CreatorDetail | null>(CREATOR_QUERY, { slug }, null),
    logoDataUri(),
    ogFonts(),
  ])

  if (!creator) {
    return new ImageResponse(<OgCard title="Not found" logoUrl={logoUrl} />, { ...size, fonts })
  }

  return new ImageResponse(
    (
      <OgCard
        eyebrow={creator.studio?.name ?? creator.location}
        title={creator.name}
        imageUrl={creator.photo ? ogImageUrl(creator.photo, 600, 600) : null}
        imageShape="square"
        logoUrl={logoUrl}
        footnote={creator.organizations?.[0]?.name ?? null}
      />
    ),
    { ...size, fonts },
  )
}

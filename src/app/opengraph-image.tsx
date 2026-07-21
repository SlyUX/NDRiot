import { ImageResponse } from 'next/og'

import { OgCard } from '@/components/og-card'
import { logoDataUri, ogFonts, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og'
import { getSiteSettings } from '@/lib/site-settings'

/** Site-wide fallback: used for any page without its own card. */
export const alt = 'ND Riot — independent comics'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  const [settings, logoUrl, fonts] = await Promise.all([
    getSiteSettings(),
    logoDataUri(),
    ogFonts(),
  ])

  return new ImageResponse(
    (
      <OgCard
        title={settings.hero.headline}
        eyebrow={settings.siteTitle}
        logoUrl={logoUrl}
        footnote={settings.siteDescription}
      />
    ),
    { ...size, fonts },
  )
}

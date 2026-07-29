import type { Metadata } from 'next'

import { ContentCardGrid } from '@/components/content-card-grid'
import { Section } from '@/components/ui/section'
import { mediaToCard } from '@/lib/card-mappers'
import { safeFetch, MEDIA_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { MediaSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.sections.mediaPageHeading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

/**
 * Media covering indie comics — a resource, not a spotlight.
 *
 * Alphabetical and unranked (§3): the site never rewards reach. The disclaimer
 * is deliberate and load-bearing — a listing here is a resource for creators
 * and readers, not an ND Riot endorsement or partnership. No nav entry; this is
 * reached from the home row and by direct link.
 */
export default async function MediaPage() {
  const [settings, media] = await Promise.all([
    getSiteSettings(),
    safeFetch<MediaSummary[]>(MEDIA_QUERY, {}, []),
  ])

  return (
    <>
      <Section padding="md" className="pb-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
          {settings.sections.mediaPageHeading}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-prose text-sm">{settings.sections.mediaIntro}</p>
        <p className="text-muted-foreground/70 border-primary/20 mt-4 max-w-prose border-l-2 pl-3 text-xs">
          {settings.sections.mediaDisclaimer}
        </p>
      </Section>

      <ContentCardGrid
        cards={media.map(mediaToCard)}
        columns={4}
        padding="md"
        emptyMessage={settings.empty.media}
      />
    </>
  )
}

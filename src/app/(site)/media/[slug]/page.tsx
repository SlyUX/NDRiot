import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { FeedPreview } from '@/components/feed-preview'
import { GenreBadge } from '@/components/genre-badge'
import { ShareBar } from '@/components/share-bar'
import { Badge } from '@/components/ui/badge'
import { Section } from '@/components/ui/section'
import { fetchFeed } from '@/lib/feed-parse'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, MEDIA_DETAIL_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import type { Genre, MediaDetail } from '@/lib/types'
import { externalHref } from '@/lib/utils'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [settings, media] = await Promise.all([
    getSiteSettings(),
    safeFetch<MediaDetail | null>(MEDIA_DETAIL_QUERY, { slug }, null),
  ])
  if (!media) return {}
  return pageMetadata({
    title: media.name,
    description: media.about,
    path: `/media/${slug}`,
    siteTitle: settings.siteTitle,
  })
}

/**
 * A media outlet's page — the outreach resource. Its links and, above all, how
 * to get covered. Carries the same independence disclaimer as the listing: not
 * an ND Riot endorsement.
 */
export default async function MediaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [settings, media] = await Promise.all([
    getSiteSettings(),
    safeFetch<MediaDetail | null>(MEDIA_DETAIL_QUERY, { slug }, null),
  ])
  if (!media) notFound()

  const sections = settings.sections

  // Their own feed — shown only by invitation (consent flag) and only when a
  // feed is actually there. Cached for half an hour; a dead feed returns null.
  const feed =
    media.feedConsent && media.feedUrl
      ? await fetchFeed(media.feedUrl, { revalidate: 1800 })
      : null

  return (
    <Section padding="md" maxWidth="3xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {media.logo && (
          <div className="relative h-32 w-32 shrink-0">
            <Image
              src={urlFor(media.logo).width(256).url()}
              alt={media.logo.alt ?? ''}
              fill
              sizes="128px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">{media.name}</h1>
          {media.kinds && media.kinds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {media.kinds.map((k) => (
                <Badge key={k} variant="outline" className="tracking-wider uppercase">
                  {k}
                </Badge>
              ))}
            </div>
          )}
          {media.about && <p className="mt-4 max-w-prose text-sm">{media.about}</p>}
          {media.genresCovered && media.genresCovered.length > 0 && (
            <div className="mt-6">
              <h2 className="text-muted-foreground text-lg font-black tracking-widest uppercase">
                {sections.mediaGenresHeading}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {media.genresCovered.map((g) => (
                  <GenreBadge key={g} genre={g as Genre} size="md" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {media.pitchInfo && (
        <div className="mt-10">
          <h2 className="text-lg font-black tracking-widest uppercase">{sections.mediaPitchHeading}</h2>
          <p className="mt-2 max-w-prose text-sm whitespace-pre-line">{media.pitchInfo}</p>
        </div>
      )}

      {media.links && media.links.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-black tracking-widest uppercase">{sections.mediaLinksHeading}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {media.links.map((link) => (
              <Badge key={link.url} variant="outline" asChild>
                <a href={externalHref(link.url)} target="_blank" rel="noopener noreferrer">
                  {link.label || link.url}
                </a>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {feed && (
        <div className="mt-10">
          <FeedPreview heading={sections.feedHeading.replace('{name}', media.name)} entries={feed.entries} />
        </div>
      )}

      <ShareBar
        title={media.name}
        url={absoluteUrl(`/media/${slug}`)}
        label={sections.shareLabel}
        copiedLabel={sections.linkCopiedLabel}
        className="mt-12"
      />

      <p className="text-muted-foreground/70 border-primary/20 mt-8 max-w-prose border-l-2 pl-3 text-xs">
        {sections.mediaDisclaimer}
      </p>
    </Section>
  )
}

import { FEED_MEDIA_QUERY, safeFetch } from '@/lib/queries'
import { renderRss } from '@/lib/rss'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import type { FEED_MEDIA_QUERY_RESULT } from '../../../../sanity.types'

/**
 * /feeds/media.xml — independent outlets as they join the directory, newest
 * first. This lists ND Riot's own entries for each outlet, not the outlets'
 * feeds (embedding those is the separate, consent-gated Media-profile feature).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const [items, settings] = await Promise.all([
    safeFetch<FEED_MEDIA_QUERY_RESULT>(FEED_MEDIA_QUERY, {}, []),
    getSiteSettings(),
  ])
  const brand = settings.siteTitle.split(':')[0].trim()

  const xml = renderRss({
    title: `${brand} — ${settings.sections.mediaPageHeading}`,
    description: settings.siteDescription,
    feedUrl: absoluteUrl('/feeds/media.xml'),
    siteUrl: absoluteUrl('/media'),
    items: items.flatMap((item) => {
      if (!item.slug) return []
      return [
        {
          title: item.name ?? 'Untitled',
          url: absoluteUrl(`/media/${item.slug}`),
          date: item._createdAt,
          description: item.about,
          categories: item.genresCovered,
        },
      ]
    }),
  })

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}

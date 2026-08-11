import { FEED_EDITORIAL_QUERY, safeFetch } from '@/lib/queries'
import { renderRss } from '@/lib/rss'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import type { FEED_EDITORIAL_QUERY_RESULT } from '../../../../sanity.types'

/**
 * /feeds/editorial.xml — ND Riot's columns and interviews as RSS 2.0.
 *
 * Own content, so unlike an outlet's feed we might embed on a Media profile
 * (which is consent-gated), publishing this raises no attribution question.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const [items, settings] = await Promise.all([
    safeFetch<FEED_EDITORIAL_QUERY_RESULT>(FEED_EDITORIAL_QUERY, {}, []),
    getSiteSettings(),
  ])
  const brand = settings.siteTitle.split(':')[0].trim()

  const xml = renderRss({
    title: `${brand} — ${settings.sections.editorialHeading}`,
    description: settings.sections.editorialDescription,
    feedUrl: absoluteUrl('/feeds/editorial.xml'),
    siteUrl: absoluteUrl('/editorial'),
    items: items.flatMap((item) => {
      // Both are guaranteed by the query's filter, but narrow rather than assert.
      if (!item.slug || !item.publishedAt) return []
      const path =
        item._type === 'column'
          ? `/editorial/columns/${item.slug}`
          : `/editorial/interviews/${item.slug}`
      return [
        {
          title: item.title ?? 'Untitled',
          url: absoluteUrl(path),
          date: item.publishedAt,
          description: item.excerpt,
          author: item.authorName ?? item.interviewerName ?? null,
        },
      ]
    }),
  })

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}

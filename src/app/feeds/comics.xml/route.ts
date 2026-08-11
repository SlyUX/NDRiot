import { FEED_COMICS_QUERY, safeFetch } from '@/lib/queries'
import { renderRss } from '@/lib/rss'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import { truncate } from '@/lib/utils'
import type { FEED_COMICS_QUERY_RESULT } from '../../../../sanity.types'

/**
 * /feeds/comics.xml — comics as they join the directory, newest first (§3:
 * arrival order surfaces new entrants, it does not rank contributors).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const [items, settings] = await Promise.all([
    safeFetch<FEED_COMICS_QUERY_RESULT>(FEED_COMICS_QUERY, {}, []),
    getSiteSettings(),
  ])
  const brand = settings.siteTitle.split(':')[0].trim()

  const xml = renderRss({
    title: `${brand} — ${settings.sections.booksHeading}`,
    description: settings.sections.booksDescription,
    feedUrl: absoluteUrl('/feeds/comics.xml'),
    siteUrl: absoluteUrl('/books'),
    items: items.flatMap((item) => {
      if (!item.slug) return []
      return [
        {
          title: item.title ?? 'Untitled',
          url: absoluteUrl(`/books/${item.slug}`),
          date: item._createdAt,
          description: truncate(item.descriptionText, 400),
          author: item.creatorName,
          categories: item.genres,
        },
      ]
    }),
  })

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}

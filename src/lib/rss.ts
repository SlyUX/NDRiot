import { SITE_URL } from '@/lib/site-url'

/**
 * One RSS 2.0 serializer for all of ND Riot's own feeds.
 *
 * Every feed (editorial, comics, media) renders through here so they can't
 * drift into three slightly-different XML dialects — the same reason the cards
 * share a component (AGENTS.md §4). Callers hand it a channel and already-
 * absolute item URLs; this owns escaping, date formatting, and the envelope.
 *
 * RSS 2.0 rather than Atom for the widest reader/aggregator/crawler support,
 * with `atom:link rel="self"` (recommended for 2.0) and `dc:creator` for
 * bylines, since RSS's own `<author>` demands an email address we don't have.
 */

export interface FeedItem {
  title: string
  /** Absolute URL — the item's page. Doubles as its permalink GUID. */
  url: string
  /** ISO date string; formatted to RFC-822 for `<pubDate>`. */
  date: string
  /** Plain text; XML-escaped here. */
  description?: string | null
  /** Byline — the comic's creator, the column's author. */
  author?: string | null
  /** Genres/kinds → `<category>` tags. Nullish entries are dropped. */
  categories?: (string | null)[] | null
}

export interface Feed {
  /** Channel title, e.g. "ND Riot — Editorial". */
  title: string
  description: string
  /** Absolute URL of this feed document (for `atom:link rel="self"`). */
  feedUrl: string
  /** Absolute URL of the page the feed represents; defaults to the site root. */
  siteUrl?: string
  items: FeedItem[]
}

/** Single-pass, so an escaped `&` is never re-escaped. */
function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) =>
    char === '<'
      ? '&lt;'
      : char === '>'
        ? '&gt;'
        : char === '&'
          ? '&amp;'
          : char === "'"
            ? '&apos;'
            : '&quot;',
  )
}

/** RSS dates are RFC-822; `toUTCString()` emits the RFC-1123 form readers accept. */
function rfc822(iso: string): string {
  return new Date(iso).toUTCString()
}

export function renderRss(feed: Feed): string {
  const site = feed.siteUrl ?? SITE_URL
  // Channel date is the newest item's, not "now" — keeps the output stable for
  // a given dataset (and honors the no-`Date.now()` habit elsewhere).
  const latest = feed.items[0]?.date

  const items = feed.items
    .map((item) => {
      const categories = (item.categories ?? [])
        .filter((c): c is string => Boolean(c))
        .map((c) => `\n      <category>${escapeXml(c)}</category>`)
        .join('')
      const author = item.author
        ? `\n      <dc:creator>${escapeXml(item.author)}</dc:creator>`
        : ''
      const description = item.description
        ? `\n      <description>${escapeXml(item.description)}</description>`
        : ''
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${rfc822(item.date)}</pubDate>${author}${description}${categories}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(site)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(feed.feedUrl)}" rel="self" type="application/rss+xml"/>${
      latest ? `\n    <lastBuildDate>${rfc822(latest)}</lastBuildDate>` : ''
    }
${items}
  </channel>
</rss>
`
}

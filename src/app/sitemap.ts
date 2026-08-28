import type { MetadataRoute } from 'next'

import { safeFetch, SITEMAP_QUERY } from '@/lib/queries'
import { absoluteUrl } from '@/lib/site-url'
import { formatSlug } from '@/lib/taxonomy'
import type { SITEMAP_QUERY_RESULT } from '../../sanity.types'

/**
 * Generated from Sanity rather than hand-listed, so a new book is crawlable
 * the moment it publishes instead of whenever someone remembers this file.
 *
 * `/studio` and `/styleguide` are deliberately absent — the Studio is an app,
 * not a page, and the styleguide is internal tooling that already carries
 * `noindex`. Listing either would invite crawling of things that are not
 * content.
 */

type SitemapEntry = MetadataRoute.Sitemap[number]

const EMPTY: SITEMAP_QUERY_RESULT = {
  books: [],
  creators: [],
  columns: [],
  interviews: [],
  downloads: [],
  resources: [],
  allies: [],
  strips: [],
  series: [],
  ragIssues: [],
  genres: [],
  formats: [],
}

/** Static routes, with the homepage weighted above the listings. */
const STATIC_ROUTES: SitemapEntry[] = [
  { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
  { url: absoluteUrl('/creators'), changeFrequency: 'daily', priority: 0.9 },
  { url: absoluteUrl('/comics'), changeFrequency: 'daily', priority: 0.9 },
  // The recruitment funnel's entrance — rated above the other static pages
  // because it is the one we most want found.
  { url: absoluteUrl('/join'), changeFrequency: 'monthly', priority: 0.9 },
  { url: absoluteUrl('/resources'), changeFrequency: 'weekly', priority: 0.7 },
  { url: absoluteUrl('/allies'), changeFrequency: 'weekly', priority: 0.6 },
  { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.6 },
  { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.3 },
  { url: absoluteUrl('/magazine'), changeFrequency: 'monthly', priority: 0.4 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await safeFetch<SITEMAP_QUERY_RESULT>(SITEMAP_QUERY, {}, EMPTY)

  const documents = (
    [
      ['/comics', data.books, 0.8] as const,
      ['/creators', data.creators, 0.8] as const,
      // Editorials (columns/interviews) and free downloads are hidden for now —
      // their detail pages still resolve, but we don't advertise them.
      ['/resources', data.resources, 0.6] as const,
      ['/allies', data.allies, 0.6] as const,
      ['/strips', data.strips, 0.7] as const,
      ['/series', data.series, 0.6] as const,
      ['/magazine', data.ragIssues, 0.5] as const,
    ] satisfies ReadonlyArray<readonly [string, { slug: string | null; _updatedAt: string }[], number]>
  ).flatMap(([base, items, priority]) =>
    items
      // A document can exist without a slug mid-edit; it has no URL, so it
      // has no place in a sitemap.
      .filter((item): item is { slug: string; _updatedAt: string } => Boolean(item.slug))
      .map(
        (item): SitemapEntry => ({
          url: absoluteUrl(`${base}/${item.slug}`),
          lastModified: new Date(item._updatedAt),
          changeFrequency: 'weekly',
          priority,
        }),
      ),
  )

  // Category pages are derived from the books that exist, matching what the
  // homepage links to. Listing the full genre list would publish URLs for
  // pages with nothing on them.
  const genres: SitemapEntry[] = data.genres.filter(Boolean).map((genre) => ({
    url: absoluteUrl(`/categories/${encodeURIComponent(genre as string)}`),
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  // Format hubs, likewise derived from the formats comics actually use. Slugged
  // (spaces → hyphens) for clean URLs — the head-term pages (graphic novels,
  // webcomics) live here.
  const formats: SitemapEntry[] = data.formats.filter(Boolean).map((format) => ({
    url: absoluteUrl(`/formats/${formatSlug(format as string)}`),
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [...STATIC_ROUTES, ...documents, ...genres, ...formats]
}

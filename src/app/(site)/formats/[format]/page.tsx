import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ContentCardGrid } from '@/components/content-card-grid'
import { HubIntro } from '@/components/hub-intro'
import { JsonLd } from '@/components/json-ld'
import { LoadMore } from '@/components/load-more'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { PAGE_SIZE, pageLimit, type SearchParams } from '@/lib/filters'
import { hubFallbackDescription, hubFallbackIntro, hubTitle } from '@/lib/hub-copy'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, FORMAT_BOOKS_QUERY, HUB_PAGE_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import { breadcrumbSchema, collectionPageSchema, jsonLdGraph } from '@/lib/structured-data'
import { formatFromSlug } from '@/lib/taxonomy'
import type { BookSummary, HubCopy, Paginated } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ format: string }>
}): Promise<Metadata> {
  const { format } = await params
  const value = formatFromSlug(format)
  if (!value) return {}
  const [hub, settings] = await Promise.all([
    safeFetch<HubCopy>(HUB_PAGE_QUERY, { kind: 'format', value }, null),
    getSiteSettings(),
  ])
  return pageMetadata({
    title: hub?.seoTitle?.trim() || hubTitle('format', value),
    description: hub?.seoDescription?.trim() || hubFallbackDescription(value),
    path: `/formats/${format}`,
    siteTitle: settings.siteTitle,
  })
}

/**
 * A comic format as a doorway — the highest-volume search terms (graphic
 * novels, webcomics) live here. Comics of the format, alphabetical and neutral
 * (AGENTS.md §3), under an editor intro; genre pages carry the creators, since
 * a maker's format says less than the genres they work in.
 */
export default async function FormatPage({
  params,
  searchParams,
}: {
  params: Promise<{ format: string }>
  searchParams: Promise<SearchParams>
}) {
  const { format } = await params
  const sp = await searchParams
  const value = formatFromSlug(format)
  // Formats are a closed set — an unknown slug is a real 404, not an empty page.
  if (!value) notFound()

  const bookLimit = pageLimit(sp, 'blimit')

  const [bookResult, hub, settings] = await Promise.all([
    safeFetch<Paginated<BookSummary>>(
      FORMAT_BOOKS_QUERY,
      { format: value, limit: bookLimit },
      { items: [], total: 0 },
    ),
    safeFetch<HubCopy>(HUB_PAGE_QUERY, { kind: 'format', value }, null),
    getSiteSettings(),
  ])
  const books = bookResult.items
  const url = absoluteUrl(`/formats/${format}`)

  return (
    <div>
      <JsonLd
        data={jsonLdGraph(
          collectionPageSchema({
            name: hub?.seoTitle?.trim() || hubTitle('format', value),
            url,
            description: hub?.seoDescription ?? hubFallbackDescription(value),
            items: books
              .filter((b) => b.slug)
              .map((b) => ({ name: b.title, url: absoluteUrl(`/books/${b.slug}`) })),
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Comics', path: '/books' },
            { name: value, path: `/formats/${format}` },
          ]),
        )}
      />

      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">{value}</h1>
        <HubIntro intro={hub?.intro} fallback={hubFallbackIntro(value)} />
      </Section>

      <ContentCardGrid
        cards={books.map(bookToCard)}
        columns={5}
        padding="md"
        footer={
          <LoadMore
            searchParams={sp}
            param="blimit"
            shown={books.length}
            total={bookResult.total}
            pageSize={PAGE_SIZE}
          />
        }
        emptyMessage={settings.empty.formatBooks}
      />
    </div>
  )
}

import { ContentCardGrid } from '@/components/content-card-grid'
import { LoadMore } from '@/components/load-more'
import { Section } from '@/components/ui/section'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import { PAGE_SIZE, pageLimit, type SearchParams } from '@/lib/filters'
import { safeFetch, GENRE_BOOKS_QUERY, GENRE_CREATORS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary, CreatorSummary, Paginated } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * A genre, from both directions: the comics in it and the people who work in
 * it.
 *
 * Creators carry their own genres rather than inheriting them from their
 * books, so someone can be findable before a single book is listed — which is
 * most of the roster early on. It also makes the genre badge on a creator
 * profile lead somewhere, instead of being a label that does nothing.
 *
 * Each grid paginates on its own key (blimit / climit) so loading more comics
 * never disturbs the creators below, and neither pulls the whole genre at once.
 */
export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ genre: string }>
  searchParams: Promise<SearchParams>
}) {
  const { genre } = await params
  const sp = await searchParams
  const decoded = decodeURIComponent(genre)
  const bookLimit = pageLimit(sp, 'blimit')
  const creatorLimit = pageLimit(sp, 'climit')

  const [bookResult, creatorResult, settings] = await Promise.all([
    safeFetch<Paginated<BookSummary>>(
      GENRE_BOOKS_QUERY,
      { genre: decoded, limit: bookLimit },
      { items: [], total: 0 },
    ),
    safeFetch<Paginated<CreatorSummary>>(
      GENRE_CREATORS_QUERY,
      { genre: decoded, limit: creatorLimit },
      { items: [], total: 0 },
    ),
    getSiteSettings(),
  ])
  const books = bookResult.items
  const creators = creatorResult.items

  return (
    <div>
      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">{decoded}</h1>
      </Section>

      <ContentCardGrid
        heading={settings.sections.genreBooksHeading}
        headingSize="sm"
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
        emptyMessage={settings.empty.genreBooks}
      />

      <ContentCardGrid
        heading={settings.sections.genreCreatorsHeading}
        headingSize="sm"
        cards={creators.map(creatorToCard)}
        layout="horizontal"
        columns={4}
        summaryLines={4}
        padding="md"
        footer={
          <LoadMore
            searchParams={sp}
            param="climit"
            shown={creators.length}
            total={creatorResult.total}
            pageSize={PAGE_SIZE}
          />
        }
        emptyMessage={settings.empty.genreCreators}
      />
    </div>
  )
}

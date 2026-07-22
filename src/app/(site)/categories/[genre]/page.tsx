import { ContentCardGrid } from '@/components/content-card-grid'
import { Section } from '@/components/ui/section'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import { safeFetch, GENRE_BOOKS_QUERY, GENRE_CREATORS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary, CreatorSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * A genre, from both directions: the comics in it and the people who work in
 * it.
 *
 * Creators carry their own genres rather than inheriting them from their
 * books, so someone can be findable before a single book is listed — which is
 * most of the roster early on. It also makes the genre badge on a creator
 * profile lead somewhere, instead of being a label that does nothing.
 */
export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params
  const decoded = decodeURIComponent(genre)

  const [books, creators, settings] = await Promise.all([
    safeFetch<BookSummary[]>(GENRE_BOOKS_QUERY, { genre: decoded }, []),
    safeFetch<CreatorSummary[]>(GENRE_CREATORS_QUERY, { genre: decoded }, []),
    getSiteSettings(),
  ])

  return (
    <div>
      <Section as="header" padding="md">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">{decoded}</h1>
      </Section>

      <ContentCardGrid
        heading={settings.sections.genreBooksHeading}
        headingSize="sm"
        cards={books.map(bookToCard)}
        columns={4}
        padding="md"
        emptyMessage={settings.empty.genreBooks}
      />

      <ContentCardGrid
        heading={settings.sections.genreCreatorsHeading}
        headingSize="sm"
        cards={creators.map(creatorToCard)}
        columns={4}
        padding="md"
        emptyMessage={settings.empty.genreCreators}
      />
    </div>
  )
}

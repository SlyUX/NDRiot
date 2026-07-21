import { ContentCardGrid } from '@/components/content-card-grid'
import { bookToCard } from '@/lib/card-mappers'
import { safeFetch, GENRE_BOOKS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params
  const decoded = decodeURIComponent(genre)
  const [books, settings] = await Promise.all([
    safeFetch<BookSummary[]>(GENRE_BOOKS_QUERY, { genre: decoded }, []),
    getSiteSettings(),
  ])

  return (
    <ContentCardGrid
      heading={decoded}
      headingAs="h1"
      headingSize="lg"
      cards={books.map(bookToCard)}
      columns={4}
      padding="none"
      maxWidth="full"
      emptyMessage={settings.empty.genreBooks}
    />
  )
}

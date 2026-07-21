import { ContentCardGrid } from '@/components/content-card-grid'
import { bookToCard } from '@/lib/card-mappers'
import { safeFetch, BOOKS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function BooksPage() {
  const [books, settings] = await Promise.all([
    safeFetch<BookSummary[]>(BOOKS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <ContentCardGrid
      heading={settings.sections.booksHeading}
      headingAs="h1"
      headingSize="lg"
      cards={books.map(bookToCard)}
      columns={4}
      emptyMessage={settings.empty.books}
    />
  )
}

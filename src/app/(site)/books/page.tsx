import { ContentCardGrid } from '@/components/content-card-grid'
import { bookToCard } from '@/lib/card-mappers'
import { safeFetch, BOOKS_QUERY } from '@/lib/queries'
import { siteCopy } from '@/lib/site-copy'
import type { BookSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function BooksPage() {
  const books = await safeFetch<BookSummary[]>(BOOKS_QUERY, {}, [])

  return (
    <ContentCardGrid
      heading={siteCopy.home.booksHeading}
      headingAs="h1"
      headingSize="lg"
      cards={books.map(bookToCard)}
      columns={4}
      padding="none"
      maxWidth="full"
      emptyMessage={siteCopy.empty.books}
    />
  )
}

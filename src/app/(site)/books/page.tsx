import BookCard from '@/components/BookCard'
import { safeFetch, BOOKS_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function BooksPage() {
  const books = await safeFetch<any[]>(BOOKS_QUERY, {}, [])
  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight">Books</h1>
      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-5">
        {books.map((b) => <BookCard key={b._id} book={b} />)}
        {!books.length && <p className="text-sm text-neutral-500">No books yet.</p>}
      </div>
    </div>
  )
}

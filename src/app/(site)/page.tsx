import Link from 'next/link'
import BookCard from '@/components/BookCard'
import CreatorCard from '@/components/CreatorCard'
import { safeFetch, FEATURES_QUERY, GENRES_QUERY, BOOKS_QUERY, CREATORS_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'

function hrefFor(item: any) {
  switch (item._type) {
    case 'book': return `/books/${item.slug}`
    case 'creator': return `/creators/${item.slug}`
    case 'column': return `/editorial/columns/${item.slug}`
    case 'interview': return `/editorial/interviews/${item.slug}`
    default: return '/'
  }
}

export default async function Home() {
  const features = await safeFetch<any[]>(FEATURES_QUERY, {}, [])
  const genres = await safeFetch<string[]>(GENRES_QUERY, {}, [])
  const books = await safeFetch<any[]>(BOOKS_QUERY, {}, [])
  const creators = await safeFetch<any[]>(CREATORS_QUERY, {}, [])

  return (
    <div className="space-y-16">
      <section className="border-b border-white/10 pb-10">
        <h1 className="text-4xl font-black uppercase leading-none tracking-tighter sm:text-6xl">
          Independent comics,<br /><span className="text-lime-400">by the creators who make them.</span>
        </h1>
        <p className="mt-4 max-w-xl text-neutral-400">A directory and discovery engine for indie comics. Disney and WB don&apos;t need your support — these creators do.</p>
      </section>

      {!!features.length && (
        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-lime-400">Featured</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.filter(Boolean).map((item) => (
              <Link key={item._id} href={hrefFor(item)} className="rounded-lg border border-white/10 p-4 hover:border-lime-400/60">
                <p className="text-xs uppercase tracking-widest text-neutral-500">{item._type}</p>
                <p className="mt-1 font-bold">{item.title || item.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!genres.length && (
        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">Browse by genre</h2>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <Link key={g} href={`/categories/${encodeURIComponent(g)}`} className="rounded-full border border-white/20 px-3 py-1 text-sm hover:border-lime-400 hover:text-lime-400">{g}</Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">Books</h2>
          <Link href="/books" className="text-sm text-lime-400 hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {books.slice(0, 8).map((b) => <BookCard key={b._id} book={b} />)}
          {!books.length && <p className="text-sm text-neutral-500">No books yet — add creators and books in the Studio.</p>}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">Creators</h2>
          <Link href="/creators" className="text-sm text-lime-400 hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
          {creators.slice(0, 10).map((c) => <CreatorCard key={c._id} creator={c} />)}
          {!creators.length && <p className="text-sm text-neutral-500">No creators yet.</p>}
        </div>
      </section>
    </div>
  )
}

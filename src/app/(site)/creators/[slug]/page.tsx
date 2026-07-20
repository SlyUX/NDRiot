import Link from 'next/link'
import { urlFor } from '@/sanity/image'
import BookCard from '@/components/BookCard'
import SocialLinks from '@/components/SocialLinks'
import PortableTextBody from '@/components/PortableTextBody'
import { safeFetch, CREATOR_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await safeFetch<any>(CREATOR_QUERY, { slug }, null)
  if (!c) return <p className="text-neutral-500">Not found.</p>
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        {c.photo && <img src={urlFor(c.photo).width(240).height(240).url()} alt={c.name} className="h-40 w-40 rounded-lg object-cover" />}
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">{c.name}</h1>
          {c.location && <p className="text-neutral-500">{c.location}</p>}
          <div className="mt-3"><SocialLinks socials={c.socials} /></div>
          {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-sm text-lime-400 hover:underline">{c.website}</a>}
        </div>
      </header>
      <PortableTextBody value={c.bio} />
      {!!c.books?.length && (
        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-lime-400">Books</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {c.books.map((b: any) => <BookCard key={b._id} book={b} />)}
          </div>
        </section>
      )}
      {!!c.favoriteCreators?.length && (
        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">Favorite creators</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {c.favoriteCreators.map((f: any, i: number) => (
              <li key={i}>
                {f.onSiteSlug ? <Link href={`/creators/${f.onSiteSlug}`} className="text-lime-400 hover:underline">{f.onSiteName}</Link>
                  : f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.name}</a>
                  : <span>{f.name}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

import Link from 'next/link'
import { urlFor } from '@/sanity/image'
import BuyLinks from '@/components/BuyLinks'
import PortableTextBody from '@/components/PortableTextBody'
import { safeFetch, BOOK_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await safeFetch<any>(BOOK_QUERY, { slug }, null)
  if (!b) return <p className="text-neutral-500">Not found.</p>
  return (
    <div className="grid gap-8 sm:grid-cols-[300px_1fr]">
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
        {b.cover && <img src={urlFor(b.cover).width(600).url()} alt={b.title} className="h-full w-full object-cover" />}
      </div>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">{b.title}</h1>
          {b.creatorName && <Link href={`/creators/${b.creatorSlug}`} className="text-sm uppercase tracking-wide text-lime-400 hover:underline">{b.creatorName}</Link>}
          <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">{b.status}{b.genres?.length ? ' · ' + b.genres.join(', ') : ''}</p>
        </div>
        <PortableTextBody value={b.description} />
        <BuyLinks links={b.buyLinks} />
        {b.kickstarterUrl && <a href={b.kickstarterUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded bg-lime-400 px-4 py-2 text-sm font-black uppercase text-black">Back on Kickstarter</a>}
      </div>
    </div>
  )
}

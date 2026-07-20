import PortableTextBody from '@/components/PortableTextBody'
import { safeFetch, COLUMN_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await safeFetch<any>(COLUMN_QUERY, { slug }, null)
  if (!c) return <p className="text-neutral-500">Not found.</p>
  return (
    <article className="space-y-6">
      <header><h1 className="text-3xl font-black uppercase tracking-tight">{c.title}</h1>
        <p className="text-xs uppercase tracking-wide text-lime-400">by {c.authorName}</p></header>
      <PortableTextBody value={c.body} />
    </article>
  )
}

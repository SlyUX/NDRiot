import Link from 'next/link'
import { safeFetch, COLUMNS_QUERY, INTERVIEWS_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function EditorialPage() {
  const columns = await safeFetch<any[]>(COLUMNS_QUERY, {}, [])
  const interviews = await safeFetch<any[]>(INTERVIEWS_QUERY, {}, [])
  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-black uppercase tracking-tight">Editorial</h1>
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-lime-400">Columns</h2>
        <ul className="space-y-4">
          {columns.map((c) => (
            <li key={c._id} className="border-b border-white/10 pb-4">
              <Link href={`/editorial/columns/${c.slug}`} className="text-lg font-bold hover:underline">{c.title}</Link>
              <p className="text-xs uppercase tracking-wide text-neutral-500">by {c.authorName}</p>
              {c.excerpt && <p className="mt-1 text-sm text-neutral-400">{c.excerpt}</p>}
            </li>
          ))}
          {!columns.length && <li className="text-sm text-neutral-500">No columns yet.</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-lime-400">Interviews</h2>
        <ul className="space-y-4">
          {interviews.map((iv) => (
            <li key={iv._id} className="border-b border-white/10 pb-4">
              <Link href={`/editorial/interviews/${iv.slug}`} className="text-lg font-bold hover:underline">{iv.title}</Link>
              <p className="text-xs uppercase tracking-wide text-neutral-500">{iv.interviewerName} interviews {iv.subjectName}</p>
              {iv.excerpt && <p className="mt-1 text-sm text-neutral-400">{iv.excerpt}</p>}
            </li>
          ))}
          {!interviews.length && <li className="text-sm text-neutral-500">No interviews yet.</li>}
        </ul>
      </section>
    </div>
  )
}

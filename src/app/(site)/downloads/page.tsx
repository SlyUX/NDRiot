import Link from 'next/link'
import { safeFetch, DOWNLOADS_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function DownloadsPage() {
  const downloads = await safeFetch<any[]>(DOWNLOADS_QUERY, {}, [])
  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight">Free Downloads</h1>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {downloads.map((d) => (
          <li key={d._id} className="rounded-lg border border-white/10 p-4">
            <Link href={`/downloads/${d.slug}`} className="font-bold hover:underline">{d.title}</Link>
            <p className="text-xs uppercase tracking-wide text-lime-400">{d.creatorName}</p>
            {d.description && <p className="mt-1 text-sm text-neutral-400">{d.description}</p>}
          </li>
        ))}
        {!downloads.length && <li className="text-sm text-neutral-500">No downloads yet.</li>}
      </ul>
    </div>
  )
}

import { safeFetch, DOWNLOAD_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function DownloadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await safeFetch<any>(DOWNLOAD_QUERY, { slug }, null)
  if (!d) return <p className="text-neutral-500">Not found.</p>
  return (
    <article className="space-y-5">
      <h1 className="text-3xl font-black uppercase tracking-tight">{d.title}</h1>
      <p className="text-xs uppercase tracking-wide text-lime-400">{d.creatorName}</p>
      {d.description && <p className="text-neutral-300">{d.description}</p>}
      {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded bg-lime-400 px-4 py-2 text-sm font-black uppercase text-black">Download</a>}
    </article>
  )
}

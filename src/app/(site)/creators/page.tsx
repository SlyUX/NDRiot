import CreatorCard from '@/components/CreatorCard'
import { safeFetch, CREATORS_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function CreatorsPage() {
  const creators = await safeFetch<any[]>(CREATORS_QUERY, {}, [])
  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight">Creators</h1>
      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-5">
        {creators.map((c) => <CreatorCard key={c._id} creator={c} />)}
        {!creators.length && <p className="text-sm text-neutral-500">No creators yet.</p>}
      </div>
    </div>
  )
}

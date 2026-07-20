import Link from 'next/link'
import { urlFor } from '@/sanity/image'
export default function CreatorCard({ creator }: { creator: any }) {
  return (
    <Link href={`/creators/${creator.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-lg bg-neutral-900">
        {creator.photo && <img src={urlFor(creator.photo).width(400).height(400).url()} alt={creator.name} className="h-full w-full object-cover group-hover:scale-105 transition" />}
      </div>
      <p className="mt-2 font-bold">{creator.name}</p>
      {creator.location && <p className="text-xs text-neutral-500">{creator.location}</p>}
    </Link>
  )
}

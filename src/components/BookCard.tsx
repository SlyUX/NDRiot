import Link from 'next/link'
import { urlFor } from '@/sanity/image'
export default function BookCard({ book }: { book: any }) {
  return (
    <Link href={`/books/${book.slug}`} className="group block">
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
        {book.cover && <img src={urlFor(book.cover).width(400).url()} alt={book.title} className="h-full w-full object-cover group-hover:scale-105 transition" />}
      </div>
      <p className="mt-2 font-bold leading-tight">{book.title}</p>
      {book.creatorName && <p className="text-xs uppercase tracking-wide text-lime-400">{book.creatorName}</p>}
    </Link>
  )
}

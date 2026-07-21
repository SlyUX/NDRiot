import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import BuyLinks from '@/components/BuyLinks'
import PortableTextBody from '@/components/PortableTextBody'
import { GenreBadge } from '@/components/genre-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { safeFetch, BOOK_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { RESTRICTED_RATING } from '@/lib/taxonomy'
import type { BookDetail } from '@/lib/types'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [book, settings] = await Promise.all([
    safeFetch<BookDetail | null>(BOOK_QUERY, { slug }, null),
    getSiteSettings(),
  ])

  if (!book) notFound()

  return (
    <div className="grid gap-8 sm:grid-cols-[300px_1fr]">
      <div className="bg-muted relative aspect-[2/3] overflow-hidden">
        {book.cover && (
          <Image
            src={urlFor(book.cover).width(600).url()}
            // Decorative by default — the title sits immediately beside it.
            alt={book.cover.alt ?? ''}
            fill
            sizes="(max-width: 640px) 100vw, 300px"
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">{book.title}</h1>
          {book.creatorName && book.creatorSlug && (
            <Link
              href={`/creators/${book.creatorSlug}`}
              className="text-primary text-sm tracking-wide uppercase hover:underline"
            >
              {book.creatorName}
            </Link>
          )}
          {(book.status || book.format || book.maturity) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {(book.status || book.format) && (
                <p className="text-muted-foreground text-xs tracking-widest uppercase">
                  {[book.status, book.format].filter(Boolean).join(' · ')}
                </p>
              )}
              {book.maturity && (
                // Mature gets the solid pink treatment; the gentler ratings
                // sit back as outlines. A reader deciding whether to click
                // should not have to hunt for the one that matters.
                <Badge
                  variant={book.maturity === RESTRICTED_RATING ? 'default' : 'outline'}
                  className="text-[10px] tracking-wider uppercase"
                >
                  {book.maturity}
                </Badge>
              )}
            </div>
          )}
          {!!book.genres?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {book.genres.map((genre) => (
                <GenreBadge key={genre} genre={genre} />
              ))}
            </div>
          )}
        </div>

        <PortableTextBody value={book.description} />
        <BuyLinks links={book.buyLinks} />

        {book.kickstarterUrl && (
          <Button asChild>
            <a href={book.kickstarterUrl} target="_blank" rel="noopener noreferrer">
              {settings.sections.kickstarterCta}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

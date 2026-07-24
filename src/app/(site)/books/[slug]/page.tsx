import Image from 'next/image'
import { notFound } from 'next/navigation'

import BookLinks from '@/components/book-links'
import { ContentCard } from '@/components/content-card'
import { ContentCardGrid } from '@/components/content-card-grid'
import PortableTextBody from '@/components/PortableTextBody'
import { GenreBadge } from '@/components/genre-badge'
import { Badge } from '@/components/ui/badge'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { safeFetch, BOOK_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { RESTRICTED_RATING } from '@/lib/taxonomy'
import type { BookDetail } from '@/lib/types'
import { truncate } from '@/lib/utils'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [book, settings] = await Promise.all([
    safeFetch<BookDetail | null>(BOOK_QUERY, { slug }, null),
    getSiteSettings(),
  ])

  if (!book) notFound()

  const creator = book.creator
  // The creator, shown as a card after the description rather than as a byline
  // under the title — a proper introduction to the person behind the work.
  const creatorCard =
    creator?.slug != null
      ? {
          title: creator.name ?? 'Creator',
          href: `/creators/${creator.slug}`,
          image: creator.photo,
          imageAlt: `Portrait of ${creator.name ?? 'creator'}`,
          eyebrow: creator.studio?.name ?? creator.location,
          summary: truncate(creator.bioText, 160),
          aspectRatio: 'square' as const,
        }
      : null

  const otherBooksHeading = settings.sections.otherBooksHeading.replace(
    '{name}',
    creator?.name ?? 'this creator',
  )

  return (
    <div>
      <Section padding="md" innerClassName="grid gap-8 sm:grid-cols-[300px_1fr]">
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
            {(book.status || book.format || book.maturity) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                {(book.status || book.format || book.issueCount) && (
                  <p className="text-muted-foreground text-xs tracking-widest uppercase">
                    {[book.status, book.format, book.issueCount ? `${book.issueCount} issue${book.issueCount === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
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
          <BookLinks links={book.links} />
        </div>
      </Section>

      {/* The creator, as a card, after the description. pt-0 keeps it tucked
          under the detail block above rather than opening a new band. */}
      {creatorCard && (
        <Section padding="md" className="pt-0">
          <div className="max-w-xl">
            <ContentCard {...creatorCard} layout="horizontal" summaryLines={4} />
          </div>
        </Section>
      )}

      {!!book.otherBooks?.length && (
        <ContentCardGrid
          heading={otherBooksHeading}
          headingSize="sm"
          cards={book.otherBooks.map(bookToCard)}
          columns={4}
          padding="md"
          emptyMessage=""
        />
      )}
    </div>
  )
}

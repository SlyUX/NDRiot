import { ImageResponse } from 'next/og'

import { OgCard } from '@/components/og-card'
import { logoDataUri, ogFonts, ogImageUrl, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og'
import { safeFetch, BOOK_QUERY } from '@/lib/queries'
import type { BookDetail } from '@/lib/types'

export const alt = 'A comic on ND Riot'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [book, logoUrl, fonts] = await Promise.all([
    safeFetch<BookDetail | null>(BOOK_QUERY, { slug }, null),
    logoDataUri(),
    ogFonts(),
  ])

  // A missing book still needs a valid image — a broken share card is worse
  // than a generic one, and this route runs before the page 404s.
  if (!book) {
    return new ImageResponse(<OgCard title="Not found" logoUrl={logoUrl} />, { ...size, fonts })
  }

  return new ImageResponse(
    (
      <OgCard
        eyebrow={book.creator?.name}
        title={book.title}
        imageUrl={book.cover ? ogImageUrl(book.cover, 600, 900) : null}
        logoUrl={logoUrl}
        footnote={[book.format, book.genres?.[0]].filter(Boolean).join(' · ') || null}
      />
    ),
    { ...size, fonts },
  )
}

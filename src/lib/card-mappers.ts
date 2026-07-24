import type { ContentCardProps } from '@/components/content-card'
import type {
  BookSummary,
  ColumnSummary,
  CreatorSummary,
  DownloadSummary,
  FavoriteCreator,
  InterviewSummary,
} from '@/lib/types'
import { truncate } from '@/lib/utils'

/**
 * Sanity projection → ContentCard props.
 *
 * This is the layer that absorbs schema differences, so ContentCard itself
 * stays presentational and there's exactly one card component (AGENTS.md §4).
 * Date formatting lives here too — ContentCard takes display strings only.
 */

/** Stable across locales and server/client, unlike bare toLocaleDateString(). */
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? undefined : DATE_FORMAT.format(parsed)
}

export function bookToCard(book: BookSummary): ContentCardProps {
  return {
    title: book.title,
    href: `/books/${book.slug}`,
    image: book.cover,
    // Fallback only — book.cover.alt wins when set. Empty is right for cover
    // art sitting directly above its own title; announcing it twice is noise.
    imageAlt: '',
    eyebrow: book.creatorName,
    genres: book.genres,
    format: book.format,
    maturity: book.maturity,
    // Shown on hover over the cover (desktop) — the opening of the description.
    hoverText: truncate(book.descriptionText, 200),
    aspectRatio: 'cover',
  }
}

/**
 * A "favorite creator" shout-out → a card.
 *
 * These are all on-site in practice, so the common path is a full creator card
 * that links to their profile with their portrait and a bio preview. An
 * off-site favourite (name + url, no ND Riot profile) becomes a plain linked
 * card; one with neither a profile nor a link has nothing to point at and is
 * dropped by the caller.
 */
export function favoriteToCard(favorite: FavoriteCreator): ContentCardProps | null {
  if (favorite.onSite?.slug) {
    const c = favorite.onSite
    return {
      title: c.name ?? 'Creator',
      href: `/creators/${c.slug}`,
      image: c.photo,
      imageAlt: `Portrait of ${c.name ?? 'creator'}`,
      eyebrow: c.studio?.name ?? c.location,
      summary: truncate(c.bioText, 160),
      aspectRatio: 'square',
    }
  }
  if (favorite.name && favorite.url) {
    return { title: favorite.name, href: favorite.url, imageAlt: '', aspectRatio: 'square' }
  }
  return null
}

export function creatorToCard(creator: CreatorSummary): ContentCardProps {
  return {
    title: creator.name,
    href: `/creators/${creator.slug}`,
    image: creator.photo,
    imageAlt: `Portrait of ${creator.name}`,
    // Studio name identifies a creator more usefully than a city does, and
    // makes the card findable by studio. Location is the fallback.
    eyebrow: creator.studio?.name ?? creator.location,
    // A short bio preview for the horizontal card (the homepage creators row).
    // Only the horizontal layout renders summary, so this is inert on the
    // vertical listing cards. bioText is pt::text(bio) — see the queries.
    summary: truncate(creator.bioText, 160),
    aspectRatio: 'square',
  }
}

export function columnToCard(column: ColumnSummary): ContentCardProps {
  return {
    title: column.title,
    href: `/editorial/columns/${column.slug}`,
    image: column.cover,
    imageAlt: '',
    eyebrow: column.authorName,
    summary: column.excerpt,
    date: formatDate(column.publishedAt),
    aspectRatio: 'video',
  }
}

export function interviewToCard(interview: InterviewSummary): ContentCardProps {
  return {
    title: interview.title,
    href: `/editorial/interviews/${interview.slug}`,
    image: interview.cover,
    imageAlt: '',
    eyebrow: interview.subjectName,
    summary: interview.excerpt,
    date: formatDate(interview.publishedAt),
    aspectRatio: 'video',
  }
}

export function downloadToCard(download: DownloadSummary): ContentCardProps {
  return {
    title: download.title,
    href: `/downloads/${download.slug}`,
    image: download.cover,
    imageAlt: '',
    eyebrow: download.creatorName,
    summary: download.description,
    aspectRatio: 'cover',
  }
}

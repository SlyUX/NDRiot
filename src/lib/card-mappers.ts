import type { ContentCardProps } from '@/components/content-card'
import type {
  BookSummary,
  ColumnSummary,
  CreatorSummary,
  DownloadSummary,
  FeatureItem,
  InterviewSummary,
} from '@/lib/types'

/**
 * Sanity projection → ContentCard props.
 *
 * This is the layer that absorbs schema differences, so ContentCard itself
 * stays presentational and there's exactly one card component (AGENTS.md §3).
 * Date formatting lives here too — ContentCard takes display strings only.
 */

/** Stable across locales and server/client, unlike bare toLocaleDateString(). */
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso?: string): string | undefined {
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
    genre: book.genres?.[0],
    aspectRatio: 'cover',
  }
}

export function creatorToCard(creator: CreatorSummary): ContentCardProps {
  return {
    title: creator.name,
    href: `/creators/${creator.slug}`,
    image: creator.photo,
    imageAlt: `Portrait of ${creator.name}`,
    eyebrow: creator.location,
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

/**
 * FEATURES_QUERY returns a mixed array, so this narrows on `_type` to pick
 * the right href pattern and image field.
 */
export function featureToCard(item: FeatureItem): ContentCardProps {
  const base = {
    title: item.title ?? item.name ?? '',
    imageAlt: '',
  }

  switch (item._type) {
    case 'book':
      return { ...base, href: `/books/${item.slug}`, image: item.cover, aspectRatio: 'cover' }
    case 'creator':
      return {
        ...base,
        href: `/creators/${item.slug}`,
        image: item.photo,
        imageAlt: `Portrait of ${base.title}`,
        aspectRatio: 'square',
      }
    case 'column':
      return {
        ...base,
        href: `/editorial/columns/${item.slug}`,
        image: item.cover,
        aspectRatio: 'video',
      }
    case 'interview':
      return {
        ...base,
        href: `/editorial/interviews/${item.slug}`,
        image: item.cover,
        aspectRatio: 'video',
      }
  }
}

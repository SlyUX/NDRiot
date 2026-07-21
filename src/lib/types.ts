import type { PortableTextBlock } from '@portabletext/types'

/**
 * Shapes returned by the GROQ projections in `queries.ts`.
 *
 * These mirror what the projection actually selects — not the full document
 * schema. If you change a projection, change the type in the same commit.
 * Fields the Studio doesn't require are optional here, because partially
 * filled documents are the normal case, not an edge case.
 */

export interface SanityDoc {
  _id: string
}

/**
 * An `imageWithAlt` document field. `alt` rides along on the image object, so
 * projections that select `cover` or `photo` get it for free — no extra GROQ.
 *
 * `alt` is optional because the Studio only warns, never blocks (see
 * `schemaTypes/imageWithAlt.ts`). Callers must decide a fallback rather than
 * assume it is present.
 */
export interface SanityImage {
  _type?: 'imageWithAlt'
  /** Present whenever the image object itself is — an image without an asset
   *  is not a state the Studio can produce. */
  asset: { _ref: string; _type: string }
  hotspot?: { x: number; y: number; height: number; width: number }
  crop?: { top: number; bottom: number; left: number; right: number }
  alt?: string
}

/** `book.status` — the Studio offers exactly these three. */
export type BookStatus = 'Ongoing' | 'Complete' | 'Upcoming'

/**
 * What kind of thing a card is pointing at. Drives FormatBadge and the
 * `/editorial/...` vs `/books/...` href split.
 */
export type ContentFormat = 'book' | 'creator' | 'column' | 'interview' | 'download'

export interface BookSummary extends SanityDoc {
  title: string
  slug: string
  status?: BookStatus
  genres?: string[]
  cover?: SanityImage
  creatorName?: string
}

export interface CreatorSummary extends SanityDoc {
  name: string
  slug: string
  location?: string
  photo?: SanityImage
}

export interface ColumnSummary extends SanityDoc {
  title: string
  slug: string
  excerpt?: string
  cover?: SanityImage
  publishedAt?: string
  authorName?: string
}

export interface InterviewSummary extends SanityDoc {
  title: string
  slug: string
  excerpt?: string
  cover?: SanityImage
  publishedAt?: string
  interviewerName?: string
  subjectName?: string
}

export interface DownloadSummary extends SanityDoc {
  title: string
  slug: string
  description?: string
  cover?: SanityImage
  publishedAt?: string
  creatorName?: string
}

/** Portable Text body content. Optional — drafts often have none yet. */
export type RichText = PortableTextBlock[]

export interface BuyLink {
  store: string
  url: string
}

export interface SocialLink {
  platform: string
  url: string
}

/**
 * `favoriteCreator` is a union in practice: either a reference to a creator
 * on this site (`onSiteName`/`onSiteSlug` populated) or a free-text name with
 * an optional external URL. Check `onSiteSlug` first.
 */
export interface FavoriteCreator {
  name?: string
  url?: string
  onSiteName?: string
  onSiteSlug?: string
}

/* ---- Detail projections (single documents) ---- */

export interface CreatorDetail extends SanityDoc {
  name: string
  location?: string
  website?: string
  bio?: RichText
  photo?: SanityImage
  socials?: SocialLink[]
  favoriteCreators?: FavoriteCreator[]
  books?: BookSummary[]
}

export interface BookDetail extends SanityDoc {
  title: string
  status?: BookStatus
  genres?: string[]
  description?: RichText
  buyLinks?: BuyLink[]
  kickstarterUrl?: string
  cover?: SanityImage
  creatorName?: string
  creatorSlug?: string
}

export interface ColumnDetail extends SanityDoc {
  title: string
  body?: RichText
  publishedAt?: string
  cover?: SanityImage
  authorName?: string
}

export interface InterviewDetail extends SanityDoc {
  title: string
  body?: RichText
  publishedAt?: string
  cover?: SanityImage
  interviewerName?: string
  subjectName?: string
}

export interface DownloadDetail extends SanityDoc {
  title: string
  description?: string
  cover?: SanityImage
  creatorName?: string
  fileUrl?: string
}

/**
 * FEATURES_QUERY dereferences a mixed array, so `_type` is the discriminant
 * and every other field is conditionally present. Narrow on `_type` before
 * reading `title` vs `name`.
 */
export interface FeatureItem extends SanityDoc {
  _type: 'book' | 'creator' | 'column' | 'interview'
  title?: string
  name?: string
  slug: string
  cover?: SanityImage
  photo?: SanityImage
}

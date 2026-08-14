import type {
  BOOKS_QUERY_RESULT,
  BOOK_QUERY_RESULT,
  COLUMNS_QUERY_RESULT,
  COLUMN_QUERY_RESULT,
  CREATORS_QUERY_RESULT,
  CREATOR_QUERY_RESULT,
  DOWNLOADS_QUERY_RESULT,
  DOWNLOAD_QUERY_RESULT,
  RESOURCES_QUERY_RESULT,
  RESOURCE_QUERY_RESULT,
  RAG_ISSUES_QUERY_RESULT,
  RAG_ISSUE_QUERY_RESULT,
  CONVENTIONS_QUERY_RESULT,
  CONVENTION_QUERY_RESULT,
  UPDATES_FEED_QUERY_RESULT,
  HERO_BOOKS_QUERY_RESULT,
  HOME_EDITORIAL_QUERY_RESULT,
  HOME_NEW_QUERY_RESULT,
  INTERVIEWS_QUERY_RESULT,
  INTERVIEW_QUERY_RESULT,
  MEDIA_QUERY_RESULT,
  MEDIA_DETAIL_QUERY_RESULT,
  HUB_PAGE_QUERY_RESULT,
  ImageWithAlt,
} from '../../sanity.types'

export type { BookFormat, Genre, MaturityRating } from '@/lib/taxonomy'

export type SanityImage = ImageWithAlt
export type RichText = NonNullable<COLUMN_QUERY_RESULT>['body']

/** Editor copy for a genre/format hub (intro + SEO overrides). Nullable — a hub can lack a doc. */
export type HubCopy = HUB_PAGE_QUERY_RESULT

/** A page of results plus the full count, from a `{items,total}` query. */
export type Paginated<T> = { items: T[]; total: number }

export type BookSummary = BOOKS_QUERY_RESULT[number]
export type CreatorSummary = CREATORS_QUERY_RESULT[number]
export type ColumnSummary = COLUMNS_QUERY_RESULT[number]
export type InterviewSummary = INTERVIEWS_QUERY_RESULT[number]
export type DownloadSummary = DOWNLOADS_QUERY_RESULT[number]
export type ResourceSummary = RESOURCES_QUERY_RESULT[number]
export type ResourceDetail = NonNullable<RESOURCE_QUERY_RESULT>
/** A resource's kind — the discriminant on `kind`. */
export type ResourceKind = ResourceSummary['kind']

export type RagIssueSummary = RAG_ISSUES_QUERY_RESULT[number]
export type RagIssueDetail = NonNullable<RAG_ISSUE_QUERY_RESULT>

export type ConventionSummary = CONVENTIONS_QUERY_RESULT[number]
export type ConventionDetail = NonNullable<CONVENTION_QUERY_RESULT>

export type UpdateFeedItem = UPDATES_FEED_QUERY_RESULT[number]
export type MediaSummary = MEDIA_QUERY_RESULT[number]
export type MediaDetail = NonNullable<MEDIA_DETAIL_QUERY_RESULT>
export type HeroBook = HERO_BOOKS_QUERY_RESULT[number]
export type HomeEditorial = HOME_EDITORIAL_QUERY_RESULT[number]
export type HomeNewItem = HOME_NEW_QUERY_RESULT[number]

export type CreatorDetail = NonNullable<CREATOR_QUERY_RESULT>
export type BookDetail = NonNullable<BOOK_QUERY_RESULT>
export type ColumnDetail = NonNullable<COLUMN_QUERY_RESULT>
export type InterviewDetail = NonNullable<INTERVIEW_QUERY_RESULT>
export type DownloadDetail = NonNullable<DOWNLOAD_QUERY_RESULT>

export type Organization = NonNullable<CreatorDetail['studio']>
export type SocialLink = NonNullable<CreatorDetail['socials']>[number]
export type FavoriteCreator = NonNullable<CreatorDetail['favoriteCreators']>[number]
export type BookLink = NonNullable<NonNullable<BOOK_QUERY_RESULT>['links']>[number]
export type BookStatus = NonNullable<BOOK_QUERY_RESULT>['status']

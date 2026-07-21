import type {
  BOOKS_QUERY_RESULT,
  BOOK_QUERY_RESULT,
  COLUMNS_QUERY_RESULT,
  COLUMN_QUERY_RESULT,
  CREATORS_QUERY_RESULT,
  CREATOR_QUERY_RESULT,
  DOWNLOADS_QUERY_RESULT,
  DOWNLOAD_QUERY_RESULT,
  FEATURES_QUERY_RESULT,
  INTERVIEWS_QUERY_RESULT,
  INTERVIEW_QUERY_RESULT,
  ImageWithAlt,
} from '../../sanity.types'

export type { BookFormat, Genre, MaturityRating } from '@/lib/taxonomy'

export type SanityImage = ImageWithAlt
export type RichText = NonNullable<COLUMN_QUERY_RESULT>['body']

export type BookSummary = BOOKS_QUERY_RESULT[number]
export type CreatorSummary = CREATORS_QUERY_RESULT[number]
export type ColumnSummary = COLUMNS_QUERY_RESULT[number]
export type InterviewSummary = INTERVIEWS_QUERY_RESULT[number]
export type DownloadSummary = DOWNLOADS_QUERY_RESULT[number]
export type FeatureItem = NonNullable<FEATURES_QUERY_RESULT>[number]

export type CreatorDetail = NonNullable<CREATOR_QUERY_RESULT>
export type BookDetail = NonNullable<BOOK_QUERY_RESULT>
export type ColumnDetail = NonNullable<COLUMN_QUERY_RESULT>
export type InterviewDetail = NonNullable<INTERVIEW_QUERY_RESULT>
export type DownloadDetail = NonNullable<DOWNLOAD_QUERY_RESULT>

export type Organization = NonNullable<CreatorDetail['studio']>
export type SocialLink = NonNullable<CreatorDetail['socials']>[number]
export type FavoriteCreator = NonNullable<CreatorDetail['favoriteCreators']>[number]
export type BuyLink = NonNullable<NonNullable<BOOK_QUERY_RESULT>['buyLinks']>[number]
export type BookStatus = NonNullable<BOOK_QUERY_RESULT>['status']

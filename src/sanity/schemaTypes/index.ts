import creator from './creator'
import book from './book'
import media from './media'
import column from './column'
import interview from './interview'
import freeDownload from './freeDownload'
import resource from './resource'
import ragIssue from './ragIssue'
import homepageFeature from './homepageFeature'
import hubPage from './hubPage'
import bookLink from './bookLink'
import mediaLink from './mediaLink'
import socialLink from './socialLink'
import favoriteCreator from './favoriteCreator'
import imageWithAlt from './imageWithAlt'
import organization from './organization'
import siteSettings from './siteSettings'

export const schemaTypes = [
  siteSettings,
  creator, book, media, column, interview, freeDownload, resource, ragIssue, homepageFeature, hubPage, organization,
  bookLink, mediaLink, socialLink, favoriteCreator, imageWithAlt,
]

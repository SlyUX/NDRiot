import { defineQuery } from 'next-sanity'

import { client } from '@/sanity/client'
export async function safeFetch<T>(query: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const result = await client.fetch<T>(query, params)
    return result ?? fallback
  } catch {
    return fallback
  }
}

export const CREATORS_QUERY = defineQuery(`*[_type=="creator"]|order(name asc){_id,name,"slug":slug.current,location,photo,studio->{_id,name,"slug":slug.current,website,logo}}`)
export const CREATOR_QUERY = defineQuery(`*[_type=="creator" && slug.current==$slug][0]{
  _id,name,location,website,bio,photo,socials,openToCollaboration,
  studio->{_id,name,"slug":slug.current,website,logo},
  organizations[]->{_id,name,"slug":slug.current,website,logo},
  favoriteCreators[]{name,url,"onSiteName":onSite->name,"onSiteSlug":onSite->slug.current},
  "books": *[_type=="book" && references(^._id)]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"creatorName":creator->name}
}`)

export const BOOKS_QUERY = defineQuery(`*[_type=="book"]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"creatorName":creator->name}`)
export const BOOK_QUERY = defineQuery(`*[_type=="book" && slug.current==$slug][0]{
  _id,title,status,genres,format,maturity,description,buyLinks,kickstarterUrl,cover,
  "creatorName":creator->name,"creatorSlug":creator->slug.current
}`)
export const GENRES_QUERY = defineQuery(`array::unique(*[_type=="book" && defined(genres)].genres[])`)
export const GENRE_BOOKS_QUERY = defineQuery(`*[_type=="book" && $genre in genres]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"creatorName":creator->name}`)

export const COLUMNS_QUERY = defineQuery(`*[_type=="column"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,publishedAt,"authorName":author->name}`)
export const COLUMN_QUERY = defineQuery(`*[_type=="column" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"authorName":author->name}`)
export const INTERVIEWS_QUERY = defineQuery(`*[_type=="interview"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,publishedAt,"interviewerName":interviewer->name,"subjectName":subject->name}`)
export const INTERVIEW_QUERY = defineQuery(`*[_type=="interview" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"interviewerName":interviewer->name,"subjectName":subject->name}`)

export const DOWNLOADS_QUERY = defineQuery(`*[_type=="freeDownload"]|order(publishedAt desc){_id,title,"slug":slug.current,description,cover,publishedAt,"creatorName":creator->name}`)
export const DOWNLOAD_QUERY = defineQuery(`*[_type=="freeDownload" && slug.current==$slug][0]{_id,title,description,cover,"creatorName":creator->name,"fileUrl":file.asset->url}`)

export const FEATURES_QUERY = defineQuery(`*[_type=="homepageFeature" && active==true]|order(order asc)[0].items[]->{
  _type,_id,title,name,"slug":slug.current,cover,photo,genres,format,maturity,
  shortDescription,excerpt,location,
  "creatorName":creator->name,
  "studioName":studio->name
}`)

/**
 * Everything with a public URL, for the sitemap.
 *
 * `_updatedAt` is a system field on every document, so lastModified is real
 * rather than "now" — search engines use it to decide what to recrawl, and a
 * sitemap that claims everything changed today teaches them to ignore it.
 */
export const SITEMAP_QUERY = defineQuery(`{
  "books": *[_type=="book" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "creators": *[_type=="creator" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "columns": *[_type=="column" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "interviews": *[_type=="interview" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "downloads": *[_type=="freeDownload" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "genres": array::unique(*[_type=="book" && defined(genres)].genres[])
}`)

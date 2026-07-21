import { client } from '@/sanity/client'
export async function safeFetch<T>(query: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const result = await client.fetch<T>(query, params)
    return result ?? fallback
  } catch {
    return fallback
  }
}

export const CREATORS_QUERY = `*[_type=="creator"]|order(name asc){_id,name,"slug":slug.current,location,photo,studio->{_id,name,"slug":slug.current,website}}`
export const CREATOR_QUERY = `*[_type=="creator" && slug.current==$slug][0]{
  _id,name,location,website,bio,photo,socials,
  studio->{_id,name,"slug":slug.current,website},
  organizations[]->{_id,name,"slug":slug.current,website},
  favoriteCreators[]{name,url,"onSiteName":onSite->name,"onSiteSlug":onSite->slug.current},
  "books": *[_type=="book" && references(^._id)]|order(title asc){_id,title,"slug":slug.current,status,cover}
}`

export const BOOKS_QUERY = `*[_type=="book"]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"creatorName":creator->name}`
export const BOOK_QUERY = `*[_type=="book" && slug.current==$slug][0]{
  _id,title,status,genres,format,maturity,description,buyLinks,kickstarterUrl,cover,
  "creatorName":creator->name,"creatorSlug":creator->slug.current
}`
export const GENRES_QUERY = `array::unique(*[_type=="book" && defined(genres)].genres[])`
export const GENRE_BOOKS_QUERY = `*[_type=="book" && $genre in genres]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"creatorName":creator->name}`

export const COLUMNS_QUERY = `*[_type=="column"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,publishedAt,"authorName":author->name}`
export const COLUMN_QUERY = `*[_type=="column" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"authorName":author->name}`
export const INTERVIEWS_QUERY = `*[_type=="interview"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,publishedAt,"interviewerName":interviewer->name,"subjectName":subject->name}`
export const INTERVIEW_QUERY = `*[_type=="interview" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"interviewerName":interviewer->name,"subjectName":subject->name}`

export const DOWNLOADS_QUERY = `*[_type=="freeDownload"]|order(publishedAt desc){_id,title,"slug":slug.current,description,cover,publishedAt,"creatorName":creator->name}`
export const DOWNLOAD_QUERY = `*[_type=="freeDownload" && slug.current==$slug][0]{_id,title,description,cover,"creatorName":creator->name,"fileUrl":file.asset->url}`

export const FEATURES_QUERY = `*[_type=="homepageFeature" && active==true]|order(order asc)[0].items[]->{
  _type,_id,title,name,"slug":slug.current,cover,photo,genres,format,maturity,
  shortDescription,excerpt,location,
  "creatorName":creator->name,
  "studioName":studio->name
}`

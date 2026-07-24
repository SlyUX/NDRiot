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

export const CREATORS_QUERY = defineQuery(`*[_type=="creator"]|order(name asc){_id,name,"slug":slug.current,location,photo,genres,openToCollaboration,"bioText":pt::text(bio),studio->{_id,name,"slug":slug.current,website,logo}}`)
export const CREATOR_QUERY = defineQuery(`*[_type=="creator" && slug.current==$slug][0]{
  _id,name,location,website,bio,photo,socials,openToCollaboration,genres,formats,audience,
  works[]{label,url},
  studio->{_id,name,"slug":slug.current,website,logo},
  organizations[]->{_id,name,"slug":slug.current,website,logo},
  favoriteCreators[]{name,url,onSite->{name,"slug":slug.current,location,photo,"bioText":pt::text(bio),studio->{name}}},
  "books": *[_type=="book" && references(^._id)]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"creatorName":creator->name}
}`)

export const BOOKS_QUERY = defineQuery(`*[_type=="book"]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"creatorName":creator->name}`)

/**
 * Books, filtered.
 *
 * `$q` searches the title AND the creator's name, so looking up a person
 * finds their work — which is what someone typing a name into a book listing
 * almost always means.
 *
 * One static query with null-tolerant conditions rather than a string built
 * at runtime: typegen can only derive a result type from a literal, and an
 * untyped query is how the null-versus-undefined class of bug got in last
 * time.
 *
 * An absent parameter is null, and `!defined(null)` is true — so each clause
 * disappears when its filter is not set.
 */
export const FILTERED_BOOKS_QUERY = defineQuery(`*[
  _type=="book"
  && (!defined($genres) || count(genres[@ in $genres]) > 0)
  && (!defined($format) || format == $format)
  && (!defined($maturity) || maturity == $maturity)
  && (!defined($status) || status == $status)
  && (!defined($q) || title match $q || creator->name match $q)
]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,issueCount,cover,"descriptionText":pt::text(description),"creatorName":creator->name}`)

/**
 * Creators, filtered.
 *
 * `formats` is an array on a creator (they make several things), so the test
 * is membership rather than equality — the opposite way round from a book,
 * where format is singular.
 */
export const FILTERED_CREATORS_QUERY = defineQuery(`*[
  _type=="creator"
  && (!defined($genres) || count(genres[@ in $genres]) > 0)
  && (!defined($format) || $format in formats)
  && (!defined($audience) || audience == $audience)
  && (!defined($collaborating) || openToCollaboration == true)
  && (!defined($q) || name match $q || studio->name match $q)
]|order(name asc){
  _id,name,"slug":slug.current,location,photo,genres,openToCollaboration,
  "bioText":pt::text(bio),
  studio->{_id,name,"slug":slug.current,website,logo}
}`)
export const BOOK_QUERY = defineQuery(`*[_type=="book" && slug.current==$slug][0]{
  _id,title,status,genres,format,maturity,issueCount,description,cover,
  links[]{kind,label,url},
  "creatorName":creator->name,"creatorSlug":creator->slug.current
}`)
export const GENRE_BOOKS_QUERY = defineQuery(`*[_type=="book" && $genre in genres]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"creatorName":creator->name}`)

export const COLUMNS_QUERY = defineQuery(`*[_type=="column"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,publishedAt,"authorName":author->name}`)
export const COLUMN_QUERY = defineQuery(`*[_type=="column" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"authorName":author->name}`)
export const INTERVIEWS_QUERY = defineQuery(`*[_type=="interview"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,publishedAt,"interviewerName":interviewer->name,"subjectName":subject->name}`)
export const INTERVIEW_QUERY = defineQuery(`*[_type=="interview" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"interviewerName":interviewer->name,"subjectName":subject->name}`)

export const DOWNLOADS_QUERY = defineQuery(`*[_type=="freeDownload"]|order(publishedAt desc){_id,title,"slug":slug.current,description,cover,publishedAt,"creatorName":creator->name}`)
export const DOWNLOAD_QUERY = defineQuery(`*[_type=="freeDownload" && slug.current==$slug][0]{_id,title,description,cover,"creatorName":creator->name,"fileUrl":file.asset->url}`)

/**
 * IDs only, for the hero's random pick.
 *
 * Two queries rather than one because there is no random() in GROQ. Fetching
 * every book in full to shuffle three of them would grow with the roster;
 * fetching identifiers stays cheap however large it gets.
 */
export const BOOK_IDS_QUERY = defineQuery(`*[_type=="book" && defined(slug.current)]._id`)

/** The books the hero landed on, in full. */
export const HERO_BOOKS_QUERY = defineQuery(`*[_type=="book" && _id in $ids]{
  _id,title,"slug":slug.current,status,genres,format,maturity,cover,shortDescription,
  "descriptionText": pt::text(description),
  "creatorName":creator->name
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

/** Creators who list a genre, for the category pages. */
export const GENRE_CREATORS_QUERY = defineQuery(`*[_type=="creator" && $genre in genres]|order(name asc){
  _id,name,"slug":slug.current,location,photo,genres,openToCollaboration,
  "bioText":pt::text(bio),
  studio->{_id,name,"slug":slug.current,website,logo}
}`)

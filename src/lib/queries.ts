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
  "books": *[_type=="book" && references(^._id)]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name}
}`)

export const BOOKS_QUERY = defineQuery(`*[_type=="book"]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name}`)

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
export const FILTERED_BOOKS_QUERY = defineQuery(`{
  "items": *[
    _type=="book"
    && (!defined($genres) || count(genres[@ in $genres]) > 0)
    && (!defined($format) || format == $format)
    && (!defined($maturity) || maturity == $maturity)
    && (!defined($status) || status == $status)
    && (!defined($funding) || count(links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))]) > 0)
    && (!defined($q) || title match $q || creator->name match $q)
  ]|order(title asc)[0...$limit]{_id,title,"slug":slug.current,status,genres,format,maturity,issueCount,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name},
  "total": count(*[
    _type=="book"
    && (!defined($genres) || count(genres[@ in $genres]) > 0)
    && (!defined($format) || format == $format)
    && (!defined($maturity) || maturity == $maturity)
    && (!defined($status) || status == $status)
    && (!defined($funding) || count(links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))]) > 0)
    && (!defined($q) || title match $q || creator->name match $q)
  ])
}`)

/**
 * Creators, filtered.
 *
 * `formats` is an array on a creator (they make several things), so the test
 * is membership rather than equality — the opposite way round from a book,
 * where format is singular.
 */
export const FILTERED_CREATORS_QUERY = defineQuery(`{
  "items": *[
    _type=="creator"
    && (!defined($genres) || count(genres[@ in $genres]) > 0)
    && (!defined($format) || $format in formats)
    && (!defined($audience) || audience == $audience)
    && (!defined($collaborating) || openToCollaboration == true)
    && (!defined($q) || name match $q || studio->name match $q)
  ]|order(name asc)[0...$limit]{
    _id,name,"slug":slug.current,location,photo,genres,openToCollaboration,
    "bioText":pt::text(bio),
    studio->{_id,name,"slug":slug.current,website,logo}
  },
  "total": count(*[
    _type=="creator"
    && (!defined($genres) || count(genres[@ in $genres]) > 0)
    && (!defined($format) || $format in formats)
    && (!defined($audience) || audience == $audience)
    && (!defined($collaborating) || openToCollaboration == true)
    && (!defined($q) || name match $q || studio->name match $q)
  ])
}`)
export const BOOK_QUERY = defineQuery(`*[_type=="book" && slug.current==$slug][0]{
  _id,title,status,genres,format,maturity,issueCount,description,cover,previewUrl,
  links[]{kind,label,url,endDate,"expired": defined(endDate) && dateTime(endDate + "T23:59:59Z") < dateTime(now())},
  "fundingUrl": links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,
  creator->{name,"slug":slug.current,location,photo,"bioText":pt::text(bio),studio->{name}},
  "otherBooks": *[_type=="book" && _id != ^._id && creator._ref == ^.creator._ref]|order(title asc){
    _id,title,"slug":slug.current,status,genres,format,maturity,cover,
    "descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name
  }
}`)
export const GENRE_BOOKS_QUERY = defineQuery(`{
  "items": *[_type=="book" && $genre in genres]|order(title asc)[0...$limit]{_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name},
  "total": count(*[_type=="book" && $genre in genres])
}`)

/**
 * Every genre that at least one book actually uses — the source for every
 * genre list a reader sees (filter facets, the Browse nav). A genre nobody has
 * published under is a dead category: filtering by it lands on an empty page,
 * so it should not be offered. Order is re-applied against the taxonomy by the
 * caller; array::unique gives no guaranteed order of its own.
 */
export const GENRES_WITH_BOOKS_QUERY = defineQuery(`array::unique(*[_type=="book" && defined(genres)].genres[])`)

export const COLUMNS_QUERY = defineQuery(`*[_type=="column"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,thumbnail,publishedAt,"authorName":author->name}`)
export const COLUMN_QUERY = defineQuery(`*[_type=="column" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"authorName":author->name,"author":author->{name,"slug":slug.current,location,photo,"bioText":pt::text(bio),studio->{name}}}`)
export const INTERVIEWS_QUERY = defineQuery(`*[_type=="interview"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,thumbnail,publishedAt,"interviewerName":interviewer->name,"subjectName":subject->name}`)
export const INTERVIEW_QUERY = defineQuery(`*[_type=="interview" && slug.current==$slug][0]{_id,title,body,publishedAt,cover,"interviewerName":interviewer->name,"subjectName":subject->name,"interviewer":interviewer->{name,"slug":slug.current,location,photo,"bioText":pt::text(bio),studio->{name}}}`)

/**
 * Recent editorial — columns and interviews interleaved by date — for the
 * homepage's editorial row. One shared shape, discriminated by `_type`, so a
 * single mapper (editorialToCard) can card either. Uses the card thumbnail with
 * the header image as fallback.
 */
export const HOME_EDITORIAL_QUERY = defineQuery(`*[_type in ["column","interview"] && defined(slug.current)]|order(publishedAt desc)[0...8]{
  _id,_type,title,"slug":slug.current,excerpt,cover,thumbnail,publishedAt,
  "authorName":author->name,
  "subjectName":subject->name
}`)

/**
 * Newest additions to the directory — books and creators interleaved — for the
 * hero's "New Books & Creators" rail. Ordered by when each joined the directory
 * (_createdAt), which is neutral and, by design, surfaces new entrants first
 * (AGENTS.md §3) rather than rewarding whoever is already established.
 *
 * One shared shape discriminated by `_type`: a book fills title/cover/maturity/
 * creatorName, a creator fills name/photo/location/studioName, and the fields
 * that do not apply resolve to null.
 */
export const HOME_NEW_QUERY = defineQuery(`*[_type in ["book","creator"] && defined(slug.current)]|order(_createdAt desc)[0...6]{
  _id,_type,"slug":slug.current,
  title,cover,maturity,"creatorName":creator->name,
  name,photo,location,"studioName":studio->name
}`)

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
  "fundingUrl": links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,
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

/**
 * Existing organizations, for the intake form's studio/collective dropdowns.
 *
 * The form submits the document `_id`, not a typed name — which is what closes
 * the identity-matching gap the whole "Updates" section of content-intake.md
 * was written to work around. Published orgs only (they carry no `drafts.`
 * lifecycle here), so the public read client sees them without a token.
 */
export const INTAKE_ORGANIZATIONS_QUERY = defineQuery(
  `*[_type=="organization" && defined(name)]|order(name asc){_id,name}`,
)

/**
 * Org ids used as some creator's `studio`. There is no studio-vs-collective
 * flag on the org itself (they share one type), so "is a studio" is inferred
 * from being referenced this way — used to keep studios out of the intake
 * form's Collectives list.
 */
export const INTAKE_STUDIO_ORG_IDS_QUERY = defineQuery(
  `*[_type=="creator" && defined(studio)].studio._ref`,
)

/**
 * Every creator id, for slug-uniqueness at intake. Run through the WRITE client
 * (token) so it includes `drafts.*` — two people must not be handed the same
 * `creator-<slug>` id, and an unpublished draft already holds one.
 */
export const INTAKE_CREATOR_IDS_QUERY = defineQuery(`*[_type=="creator"]._id`)

/**
 * Published creators, for the intake form's "updating an existing profile?"
 * dropdown. Published only (public read client, no token) — you can only update
 * a profile that already exists live, matching the importer's update target.
 */
export const INTAKE_CREATORS_QUERY = defineQuery(
  `*[_type=="creator" && defined(slug.current)]|order(name asc){_id,name}`,
)

/**
 * The signed-in user's own profiles, for the update picker. Restricted to the
 * creator ids the ownership map says this email may edit — so the picker only
 * ever lists profiles the person actually owns.
 */
export const INTAKE_OWNED_CREATORS_QUERY = defineQuery(
  `*[_type=="creator" && _id in $ids && defined(slug.current)]|order(name asc){_id,name}`,
)

/**
 * One creator's editable values, to prepopulate the intake form on an update.
 * Returns the raw shape the form needs — bio as plain text for a textarea,
 * references as bare ids for the selects — not the display projection.
 */
export const INTAKE_CREATOR_EDIT_QUERY = defineQuery(`*[_type=="creator" && _id==$id][0]{
  _id,name,"slug":slug.current,location,website,
  "bioText":pt::text(bio),
  socials[]{platform,url},
  works[]{label,url},
  genres,formats,openToCollaboration,
  photo,"photoAlt":photo.alt,
  "studioId":studio._ref,
  "studioName":studio->name,
  "studioWebsite":studio->website,
  "studioLogo":studio->logo,
  "orgIds":organizations[]._ref
}`)

/** Creators who list a genre, for the category pages. */
export const GENRE_CREATORS_QUERY = defineQuery(`{
  "items": *[_type=="creator" && $genre in genres]|order(name asc)[0...$limit]{
    _id,name,"slug":slug.current,location,photo,genres,openToCollaboration,
    "bioText":pt::text(bio),
    studio->{_id,name,"slug":slug.current,website,logo}
  },
  "total": count(*[_type=="creator" && $genre in genres])
}`)

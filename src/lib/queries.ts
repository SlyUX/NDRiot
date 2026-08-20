import { defineQuery } from "next-sanity";

import { client, liveClient } from "@/sanity/client";
export async function safeFetch<T>(
  query: string,
  params: Record<string, unknown>,
  fallback: T,
): Promise<T> {
  try {
    const result = await client.fetch<T>(query, params);
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Like safeFetch, but reads live (non-CDN) — for creator-authored, mutable
 * content (ratings, appearances) so a writer sees their change immediately
 * instead of after the CDN cache catches up. Use only where that matters.
 */
export async function freshFetch<T>(
  query: string,
  params: Record<string, unknown>,
  fallback: T,
): Promise<T> {
  try {
    const result = await liveClient.fetch<T>(query, params);
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

export const CREATORS_QUERY = defineQuery(
  `*[_type=="creator"]|order(name asc){_id,name,"slug":slug.current,place,photo,genres,openToCollaboration,"joinedAt":_createdAt,"bioText":pt::text(bio),studio->{_id,name,"slug":slug.current,website,logo}}`,
);
export const CREATOR_QUERY =
  defineQuery(`*[_type=="creator" && slug.current==$slug][0]{
  _id,name,place,website,feedUrl,bio,"bioText":pt::text(bio),photo,socials,openToCollaboration,genres,formats,audience,
  works[]{label,url},
  studio->{_id,name,"slug":slug.current,website,logo},
  organizations[]->{_id,name,"slug":slug.current,website,logo},
  favoriteCreators[]{name,url,onSite->{name,"slug":slug.current,place,photo,"bioText":pt::text(bio),studio->{name}}},
  "books": *[_type=="book" && references(^._id)]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name}
}`);
// A creator's convention appearances (separate docs), venue resolved — for the
// profile Events row. The caller filters to upcoming by forDate/venue dates.
export const CREATOR_APPEARANCES_QUERY =
  defineQuery(`*[_type=="conventionAppearance" && creator._ref==$creatorId && defined(venue)]{
  _id,status,tableNumber,note,forDate,
  "venue":venue->{_id,name,"slug":slug.current,website,startDate,endDate,place}
}`);
// Appearances across a set of owned creators — for the dashboard events manager.
// Same venue shape as CREATOR_APPEARANCES_QUERY so both feed one AppearanceCard;
// creatorId/venueId identify the doc for removal.
export const OWNED_APPEARANCES_QUERY =
  defineQuery(`*[_type=="conventionAppearance" && creator._ref in $creatorIds && defined(venue)]
  | order(venue->name asc){
  _id,status,tableNumber,note,forDate,
  "creatorId":creator._ref,
  "venueId":venue._ref,
  "venue":venue->{_id,name,"slug":slug.current,website,startDate,endDate,place}
}`);

export const BOOKS_QUERY = defineQuery(
  `*[_type=="book"]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name}`,
);

/**
 * Books, filtered.
 *
 * `$q` searches the title, the creator's name, and the description (short and
 * long), so looking up a person finds their work — which is what someone typing
 * a name into a comics listing almost always means — and a phrase from a
 * synopsis finds the comic even when the title doesn't contain it.
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
    && (!defined($preview) || defined(previewUrl))
    && (!defined($q) || title match $q || creator->name match $q || shortDescription match $q || pt::text(description) match $q)
  ]|order(title asc)[0...$limit]{_id,title,"slug":slug.current,status,genres,format,maturity,issueCount,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name},
  "total": count(*[
    _type=="book"
    && (!defined($genres) || count(genres[@ in $genres]) > 0)
    && (!defined($format) || format == $format)
    && (!defined($maturity) || maturity == $maturity)
    && (!defined($status) || status == $status)
    && (!defined($funding) || count(links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))]) > 0)
    && (!defined($preview) || defined(previewUrl))
    && (!defined($q) || title match $q || creator->name match $q || shortDescription match $q || pt::text(description) match $q)
  ])
}`);

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
    && (!defined($q) || name match $q || studio->name match $q || pt::text(bio) match $q)
  ]|order(name asc)[0...$limit]{
    _id,name,"slug":slug.current,place,photo,genres,openToCollaboration,
    "bioText":pt::text(bio),
    studio->{_id,name,"slug":slug.current,website,logo}
  },
  "total": count(*[
    _type=="creator"
    && (!defined($genres) || count(genres[@ in $genres]) > 0)
    && (!defined($format) || $format in formats)
    && (!defined($audience) || audience == $audience)
    && (!defined($collaborating) || openToCollaboration == true)
    && (!defined($q) || name match $q || studio->name match $q || pt::text(bio) match $q)
  ])
}`);
export const BOOK_QUERY =
  defineQuery(`*[_type=="book" && slug.current==$slug][0]{
  _id,title,status,genres,format,maturity,issueCount,description,"descriptionText":pt::text(description),cover,previewUrl,
  videos[]{title,url},
  links[]{kind,label,url,endDate,"expired": defined(endDate) && dateTime(endDate + "T23:59:59Z") < dateTime(now())},
  "fundingUrl": links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,
  "creatorId": creator._ref,
  creator->{name,"slug":slug.current,place,photo,"bioText":pt::text(bio),studio->{name}},
  "otherBooks": *[_type=="book" && _id != ^._id && creator._ref == ^.creator._ref]|order(title asc){
    _id,title,"slug":slug.current,status,genres,format,maturity,cover,
    "descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name
  }
}`);
export const GENRE_BOOKS_QUERY = defineQuery(`{
  "items": *[_type=="book" && $genre in genres]|order(title asc)[0...$limit]{_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name},
  "total": count(*[_type=="book" && $genre in genres])
}`);

/** Comics of one format, for the /formats/[format] hub. Alphabetical, neutral. */
export const FORMAT_BOOKS_QUERY = defineQuery(`{
  "items": *[_type=="book" && format==$format]|order(title asc)[0...$limit]{_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name},
  "total": count(*[_type=="book" && format==$format])
}`);

/** Editor-written intro + SEO copy for a genre/format hub. Absent → generated fallback. */
export const HUB_PAGE_QUERY =
  defineQuery(`*[_type=="hubPage" && kind==$kind && value==$value][0]{
  intro, seoTitle, seoDescription
}`);

/**
 * Every genre that at least one book actually uses — the source for every
 * genre list a reader sees (filter facets, the Browse nav). A genre nobody has
 * published under is a dead category: filtering by it lands on an empty page,
 * so it should not be offered. Order is re-applied against the taxonomy by the
 * caller; array::unique gives no guaranteed order of its own.
 */
export const GENRES_WITH_BOOKS_QUERY = defineQuery(
  `array::unique(*[_type=="book" && defined(genres)].genres[])`,
);

export const COLUMNS_QUERY = defineQuery(
  `*[_type=="column"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,thumbnail,publishedAt,"authorName":author->name}`,
);
export const COLUMN_QUERY = defineQuery(
  `*[_type=="column" && slug.current==$slug][0]{_id,title,excerpt,body,publishedAt,cover,"authorName":author->name,"author":author->{name,"slug":slug.current,place,photo,"bioText":pt::text(bio),studio->{name}}}`,
);
export const INTERVIEWS_QUERY = defineQuery(
  `*[_type=="interview"]|order(publishedAt desc){_id,title,"slug":slug.current,excerpt,cover,thumbnail,publishedAt,"interviewerName":interviewer->name,"subjectName":subject->name}`,
);
export const INTERVIEW_QUERY = defineQuery(
  `*[_type=="interview" && slug.current==$slug][0]{_id,title,excerpt,body,publishedAt,cover,"interviewerName":interviewer->name,"subjectName":subject->name,"interviewer":interviewer->{name,"slug":slug.current,place,photo,"bioText":pt::text(bio),studio->{name}}}`,
);

/**
 * Recent editorial — columns and interviews interleaved by date — for the
 * homepage's editorial row. One shared shape, discriminated by `_type`, so a
 * single mapper (editorialToCard) can card either. Uses the card thumbnail with
 * the header image as fallback.
 */
export const HOME_EDITORIAL_QUERY =
  defineQuery(`*[_type in ["column","interview"] && defined(slug.current)]|order(publishedAt desc)[0...8]{
  _id,_type,title,"slug":slug.current,excerpt,cover,thumbnail,publishedAt,
  "authorName":author->name,
  "subjectName":subject->name
}`);

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
export const HOME_NEW_QUERY =
  defineQuery(`*[_type in ["book","creator"] && defined(slug.current)]|order(_createdAt desc)[0...4]{
  _id,_type,"slug":slug.current,genres,
  title,"creatorName":creator->name,"descriptionText":pt::text(description),
  name,"bioText":pt::text(bio)
}`);

/* ---------------------------------------------------- reader saves (/me)
 * Resolve a signed-in reader's saved ids back to card-shaped summaries. Same
 * projections as BOOKS_QUERY / CREATORS_QUERY so the cards match everywhere.
 */
export const SAVED_BOOKS_QUERY = defineQuery(
  `*[_type=="book" && _id in $ids && defined(slug.current)]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name}`,
);

/** A creator's display name + public slug, by id — for the signed-in hero
 *  (greet by their ND Riot profile name, link to their public page). */
export const CREATOR_HERO_QUERY = defineQuery(
  `*[_type=="creator" && _id==$id][0]{name,"slug":slug.current,photo,"region":place.region}`,
);

export const SAVED_CREATORS_QUERY = defineQuery(
  `*[_type=="creator" && _id in $ids && defined(slug.current)]|order(name asc){_id,name,"slug":slug.current,place,photo,genres,openToCollaboration,"joinedAt":_createdAt,"bioText":pt::text(bio),studio->{_id,name,"slug":slug.current,website,logo}}`,
);

/** The docs a signed-in owner can manage — creators and media they own. */
export const OWNED_DOCS_QUERY = defineQuery(
  `*[_id in $ids && defined(slug.current)]{_id,_type,name,"slug":slug.current}|order(name asc)`,
);

/** An owner's comics — books whose creator is one they own ($ids = creator ids). */
export const OWNED_BOOKS_QUERY = defineQuery(
  `*[_type=="book" && creator._ref in $ids && defined(slug.current)]|order(title asc){_id,title,"slug":slug.current,status,genres,format,maturity,cover,"descriptionText":pt::text(description),"fundingUrl":links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,"creatorName":creator->name}`,
);

/** An owner's media outlets, by id. */
export const OWNED_MEDIA_QUERY = defineQuery(
  `*[_type=="media" && _id in $ids && defined(slug.current)]|order(name asc){_id,name,"slug":slug.current,kinds,logo,about,genresCovered}`,
);

/**
 * The reader's update feed — updates whose target (a comic or creator) is in the
 * reader's saved set (Save = Follow), newest first. Recency only, never ranked
 * or counted (§3). Target resolved to a name + slug for linking.
 */
/**
 * The homepage hero rail's updates section — updates from the creators/comics a
 * signed-in reader follows (target in their saved `$ids`), newest first. Updates
 * are a follow-benefit, not a global broadcast: no volume race for the homepage
 * (§3-spirit). Carries the author's avatar (the creator behind the target) and
 * the update's mentions. Recency only, never ranked.
 */
export const RAIL_UPDATES_QUERY =
  defineQuery(`*[_type=="update" && target._ref in $ids && defined(publishedAt)]|order(publishedAt desc)[0...$limit]{
  _id,body,kind,publishedAt,
  "targetType":target->_type,
  "targetName":coalesce(target->title,target->name),
  "targetSlug":target->slug.current,
  "authorName":coalesce(target->name,target->creator->name),
  "photo":coalesce(target->photo,target->creator->photo),
  "mentions":mentions[]->{_id,_type,"name":coalesce(name,title),"slug":slug.current,website}
}`);

/**
 * Convention appearances by followed creators, as feed items — a creator marking
 * that they'll be at a con surfaces to their followers alongside their updates.
 * These aren't `update` docs, so the caller maps each into an "At a convention"
 * feed item (feed-mappers) and merges by date. Upcoming only: an appearance
 * whose occurrence date has passed auto-drops (undated ones stay). Recency of
 * the marking (`_createdAt`), never ranked (§3). `$ids` are followed creator ids
 * (book ids in the set simply never match a `creator._ref`).
 */
export const APPEARANCE_FEED_QUERY =
  defineQuery(`*[_type=="conventionAppearance" && creator._ref in $ids && defined(creator->slug.current) && defined(venue->slug.current) && (!defined(forDate) || dateTime(forDate) > dateTime(now()))]|order(_createdAt desc)[0...$limit]{
  _id,status,
  "publishedAt":_createdAt,
  "creatorId":creator._ref,
  "creatorName":creator->name,
  "creatorSlug":creator->slug.current,
  "creatorPhoto":creator->photo,
  "venue":venue->{_id,_type,name,"slug":slug.current,website}
}`);

export const UPDATES_FEED_QUERY =
  defineQuery(`*[_type=="update" && target._ref in $ids && defined(publishedAt)]|order(publishedAt desc)[0...$limit]{
  _id,body,kind,publishedAt,
  "targetId":target._ref,
  "targetType":target->_type,
  "targetName":coalesce(target->title,target->name),
  "targetSlug":target->slug.current,
  "mentions":mentions[]->{_id,_type,"name":coalesce(name,title),"slug":slug.current,website}
}`);

/**
 * A creator's own updates, for their public profile — posts targeting the
 * creator directly, or one of their comics. Recency only (§3). Same shape as the
 * reader feed, so it renders through the same component.
 */
export const CREATOR_UPDATES_QUERY =
  defineQuery(`*[_type=="update" && defined(publishedAt) && (target._ref == $creatorId || target->creator._ref == $creatorId)]|order(publishedAt desc)[0...$limit]{
  _id,body,kind,publishedAt,
  "targetId":target._ref,
  "targetType":target->_type,
  "targetName":coalesce(target->title,target->name),
  "targetSlug":target->slug.current,
  "mentions":mentions[]->{_id,_type,"name":coalesce(name,title),"slug":slug.current,website}
}`);

/* ---------------------------------------------------- RSS feeds
 * Item projections for ND Riot's own feeds (src/app/feeds/*.xml). Each is
 * newest-first and capped at 30, so a growing roster never bloats a feed.
 * Editorial orders by publishedAt (the editor's date); comics and media by
 * _createdAt (arrival in the directory), matching the "new" framing (§3).
 */
export const FEED_EDITORIAL_QUERY =
  defineQuery(`*[_type in ["column","interview"] && defined(slug.current) && defined(publishedAt)]|order(publishedAt desc)[0...30]{
  _id,_type,title,"slug":slug.current,excerpt,publishedAt,
  "authorName":author->name,"interviewerName":interviewer->name
}`);

export const FEED_COMICS_QUERY =
  defineQuery(`*[_type=="book" && defined(slug.current)]|order(_createdAt desc)[0...30]{
  _id,title,"slug":slug.current,_createdAt,
  "descriptionText":pt::text(description),"creatorName":creator->name,genres
}`);

export const FEED_MEDIA_QUERY =
  defineQuery(`*[_type=="media" && defined(slug.current)]|order(_createdAt desc)[0...30]{
  _id,name,"slug":slug.current,_createdAt,about,genresCovered
}`);

export const DOWNLOADS_QUERY = defineQuery(
  `*[_type=="freeDownload"]|order(publishedAt desc){_id,title,"slug":slug.current,description,cover,publishedAt,"creatorName":creator->name}`,
);
export const DOWNLOAD_QUERY = defineQuery(
  `*[_type=="freeDownload" && slug.current==$slug][0]{_id,title,description,cover,"creatorName":creator->name,"fileUrl":file.asset->url}`,
);

// Resources — grouped by category then title (neutral order, never ranked —
// §3). Cards link to the resource's own page; `kind` drives the card's label.
export const RESOURCES_QUERY = defineQuery(
  `*[_type=="resource" && defined(slug.current)]|order(category asc, title asc){_id,title,"slug":slug.current,kind,category,description,image}`,
);

// Recent resources for the homepage row — by recency (neutral, §3), same card
// fields as RESOURCES_QUERY so both share ResourceSummary.
export const HOME_RESOURCES_QUERY = defineQuery(
  `*[_type=="resource" && defined(slug.current)]|order(coalesce(publishedAt,_createdAt) desc)[0...8]{_id,title,"slug":slug.current,kind,category,description,image}`,
);

// A single resource page. `kind` selects the lead media (videoUrl / fileUrl /
// url); `body` is the write-up beneath it (Portable Text with inline images).
export const RESOURCE_QUERY =
  defineQuery(`*[_type=="resource" && slug.current==$slug][0]{
  _id,title,kind,category,description,body,videoUrl,url,image,publishedAt,source,
  "fileUrl":file.asset->url,
  "creatorName":creator->name,"creatorSlug":creator->slug.current
}`);

/** Distinct resource categories that have at least one published resource — for the nav. */
export const RESOURCE_CATEGORIES_WITH_CONTENT_QUERY = defineQuery(
  `array::unique(*[_type=="resource" && defined(slug.current) && defined(category)].category)`,
);

// ---- Conventions ----
// Directory cards — every convention, alphabetical (neutral order, never by
// rating; §3). A venue creators table at, not a contributor.
export const CONVENTIONS_QUERY = defineQuery(
  `*[_type=="convention" && defined(slug.current)]|order(name asc){_id,name,"slug":slug.current,place,whenHint,startDate,endDate,description,image,"ratings":*[_type=="venueRating" && target._ref==^._id]{benefits}}`,
);
// The same directory, narrowed by an explicit State filter (place.region, a
// US-state code) and/or a name/city search. Absent params mean "no filter", not
// "match nothing". Fetched alphabetically; the page reorders upcoming-first (§3-
// safe date order) in JS, since GROQ can't band by upcoming/dateless/past.
export const FILTERED_CONVENTIONS_QUERY = defineQuery(
  `*[_type=="convention" && defined(slug.current)
    && (!defined($region) || place.region == $region)
    && (!defined($q) || name match $q || place.city match $q)
  ]|order(name asc){_id,name,"slug":slug.current,place,whenHint,startDate,endDate,description,image,"ratings":*[_type=="venueRating" && target._ref==^._id]{benefits}}`,
);
// The distinct US-state codes that actually have a convention — the region
// facet's option set (a state nobody tables in is never offered).
export const CONVENTION_REGIONS_QUERY = defineQuery(
  `array::unique(*[_type=="convention" && defined(slug.current) && defined(place.region)].place.region)`,
);
// One owned creator's stored region code — seeds the "Near me" shortcut on the
// conventions page. Null when they haven't set a location.
export const OWNED_CREATOR_REGION_QUERY = defineQuery(
  `*[_type=="creator" && _id==$id][0].place.region`,
);
// Minimal name + slug for a set of creators — resolves collab-request ids (which
// live in the private dataset) to public identities for the /me dashboard.
export const COLLAB_CREATORS_QUERY = defineQuery(
  `*[_type=="creator" && _id in $ids]{_id,name,"slug":slug.current}`,
);
// The on-site creator ids one creator has cosigned — seeds the Cosign button's
// pressed state on another creator's profile.
export const COSIGNED_IDS_QUERY = defineQuery(
  `*[_type=="creator" && _id==$id][0].favoriteCreators[defined(onSite)].onSite._ref`,
);
// A single convention page.
export const CONVENTION_QUERY =
  defineQuery(`*[_type=="convention" && slug.current==$slug][0]{
  _id,name,"slug":slug.current,place,whenHint,startDate,endDate,website,description,image
}`);
// Creators tabling at a convention — from the appearance docs, creator resolved.
// Neutral (alphabetical) order, never by anything rank-like (§3). The caller
// filters to the active occurrence by forDate; table number rides along.
export const CONVENTION_TABLERS_QUERY =
  defineQuery(`*[_type=="conventionAppearance" && venue._ref==$conId && status=="tabling" && defined(creator->slug.current)]
  | order(creator->name asc){
  "_id": creator->_id,"name": creator->name,"slug": creator->slug.current,"photo": creator->photo,
  tableNumber,forDate
}`);
// All creator ratings of a convention — raw, aggregated in JS (per-aspect
// averages only, §3 — never a composite score, never orders discovery). Notes
// are attributed to their creator.
export const CONVENTION_RATINGS_QUERY =
  defineQuery(`*[_type=="venueRating" && target._ref==$conId]{
  benefits,celebrityFocused,tableCost,note,
  "creatorName":creator->name,"creatorSlug":creator->slug.current
}`);
// The viewer's rating context for a con: which of their owned creators has an
// appearance here (rating is gated on attendance) and each one's existing
// rating, to prefill the form.
export const CON_RATING_CONTEXT_QUERY =
  defineQuery(`*[_type=="creator" && _id in $creatorIds]{
  _id,name,
  "appearance": *[_type=="conventionAppearance" && creator._ref==^._id && venue._ref==$conId][0]{status,tableNumber,note},
  "rating": *[_type=="venueRating" && creator._ref==^._id && target._ref==$conId][0]{benefits,celebrityFocused,tableCost,note}
}`);

// ---- ND Riot Rag (magazine) ----
// Archive cards — every issue, newest (highest number) first.
export const RAG_ISSUES_QUERY = defineQuery(
  `*[_type=="ragIssue" && defined(slug.current)]|order(issueNumber desc){_id,title,issueNumber,"slug":slug.current,cover,publishedAt}`,
);
// The newest issue, in full — featured on /magazine.
export const RAG_LATEST_QUERY =
  defineQuery(`*[_type=="ragIssue" && defined(slug.current)]|order(issueNumber desc)[0]{
  _id,title,issueNumber,publishedAt,description,cover,"pdfUrl":pdfFile.asset->url,
  buyLinks[]{kind,label,url,endDate,"expired": defined(endDate) && dateTime(endDate + "T23:59:59Z") < dateTime(now())},
  toc,
  contributors[]{_key,section,role,customName,"creatorName":creator->name,"creatorSlug":creator->slug.current}
}`);
// A single issue page.
export const RAG_ISSUE_QUERY =
  defineQuery(`*[_type=="ragIssue" && slug.current==$slug][0]{
  _id,title,issueNumber,publishedAt,description,cover,"pdfUrl":pdfFile.asset->url,
  buyLinks[]{kind,label,url,endDate,"expired": defined(endDate) && dateTime(endDate + "T23:59:59Z") < dateTime(now())},
  toc,
  contributors[]{_key,section,role,customName,"creatorName":creator->name,"creatorSlug":creator->slug.current}
}`);

/**
 * IDs only, for the hero's random pick.
 *
 * Two queries rather than one because there is no random() in GROQ. Fetching
 * every book in full to shuffle three of them would grow with the roster;
 * fetching identifiers stays cheap however large it gets.
 */
export const BOOK_IDS_QUERY = defineQuery(
  `*[_type=="book" && defined(slug.current)]._id`,
);

/** The books the hero landed on, in full. */
export const HERO_BOOKS_QUERY = defineQuery(`*[_type=="book" && _id in $ids]{
  _id,title,"slug":slug.current,status,genres,format,maturity,cover,shortDescription,
  "descriptionText": pt::text(description),
  "fundingUrl": links[kind=="Back" && (!defined(endDate) || dateTime(endDate+"T23:59:59Z")>dateTime(now()))][0].url,
  "creatorName":creator->name,"creatorId":creator._ref
}`);

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
  "resources": *[_type=="resource" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "ragIssues": *[_type=="ragIssue" && defined(slug.current)]{"slug":slug.current,_updatedAt},
  "genres": array::unique(*[_type=="book" && defined(genres)].genres[]),
  "formats": array::unique(*[_type=="book" && defined(format)].format)
}`);

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
);

/**
 * Org ids used as some creator's `studio`. There is no studio-vs-collective
 * flag on the org itself (they share one type), so "is a studio" is inferred
 * from being referenced this way — used to keep studios out of the intake
 * form's Collectives list.
 */
export const INTAKE_STUDIO_ORG_IDS_QUERY = defineQuery(
  `*[_type=="creator" && defined(studio)].studio._ref`,
);

/**
 * Every creator id, for slug-uniqueness at intake. Run through the WRITE client
 * (token) so it includes `drafts.*` — two people must not be handed the same
 * `creator-<slug>` id, and an unpublished draft already holds one.
 */
export const INTAKE_CREATOR_IDS_QUERY = defineQuery(`*[_type=="creator"]._id`);

/**
 * Published creators, for the intake form's "updating an existing profile?"
 * dropdown. Published only (public read client, no token) — you can only update
 * a profile that already exists live, matching the importer's update target.
 */
export const INTAKE_CREATORS_QUERY = defineQuery(
  `*[_type=="creator" && defined(slug.current)]|order(name asc){_id,name}`,
);

/**
 * The signed-in user's own profiles, for the update picker. Restricted to the
 * creator ids the ownership map says this email may edit — so the picker only
 * ever lists profiles the person actually owns.
 */
export const INTAKE_OWNED_CREATORS_QUERY = defineQuery(
  `*[_type=="creator" && _id in $ids && defined(slug.current)]|order(name asc){_id,name}`,
);

/**
 * One creator's editable values, to prepopulate the intake form on an update.
 * Returns the raw shape the form needs — bio as plain text for a textarea,
 * references as bare ids for the selects — not the display projection.
 */
export const INTAKE_CREATOR_EDIT_QUERY =
  defineQuery(`*[_type=="creator" && _id==$id][0]{
  _id,name,"slug":slug.current,place,website,feedUrl,
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
}`);

/* ------------------------------------------------------------ book intake */

/**
 * Every book id, for slug-uniqueness at book intake. Through the WRITE client
 * (token) so it includes `drafts.*`.
 */
export const INTAKE_BOOK_IDS_QUERY = defineQuery(`*[_type=="book"]._id`);

/**
 * The signed-in user's books — those under a creator they own — for the book
 * picker. `$ids` is the owned creator id set.
 */
export const INTAKE_OWNED_BOOKS_QUERY = defineQuery(
  `*[_type=="book" && creator._ref in $ids && defined(slug.current)]|order(title asc){
    _id,title,"creatorName":creator->name
  }`,
);

/**
 * One book's editable values, to prepopulate the book form on an update.
 * References as bare ids, description as plain text, links in full.
 */
export const INTAKE_BOOK_EDIT_QUERY =
  defineQuery(`*[_type=="book" && _id==$id][0]{
  _id,title,"slug":slug.current,
  "creatorId":creator._ref,
  genres,format,maturity,status,issueCount,
  shortDescription,
  "descriptionText":pt::text(description),
  cover,"coverAlt":cover.alt,
  previewUrl,
  links[]{kind,label,url,endDate},
  videos[]{title,url}
}`);

/* ----------------------------------------------------------------- media */

/** Media outlets, for the /media card listing — alphabetical, unranked (§3). */
export const MEDIA_QUERY = defineQuery(
  `*[_type=="media" && defined(slug.current)]|order(name asc){
    _id,name,"slug":slug.current,kinds,logo,about,genresCovered
  }`,
);

/** One media outlet's detail page. */
export const MEDIA_DETAIL_QUERY =
  defineQuery(`*[_type=="media" && slug.current==$slug][0]{
  _id,name,kinds,logo,about,genresCovered,pitchInfo,feedUrl,feedConsent,
  links[]{label,url}
}`);

/* ---------------------------------------------------- media intake */

export const INTAKE_MEDIA_IDS_QUERY = defineQuery(`*[_type=="media"]._id`);

/** The signed-in user's media outlets, for the picker. `$ids` is owned doc ids. */
export const INTAKE_OWNED_MEDIA_QUERY = defineQuery(
  `*[_type=="media" && _id in $ids && defined(slug.current)]|order(name asc){_id,name}`,
);

/** One media outlet's editable values, to prepopulate the form on an update. */
export const INTAKE_MEDIA_EDIT_QUERY =
  defineQuery(`*[_type=="media" && _id==$id][0]{
  _id,name,"slug":slug.current,kinds,
  "aboutText":about,
  genresCovered,pitchInfo,
  logo,"logoAlt":logo.alt,
  links[]{label,url},
  feedUrl,feedConsent
}`);

/** Creators who list a genre, for the category pages. */
export const GENRE_CREATORS_QUERY = defineQuery(`{
  "items": *[_type=="creator" && $genre in genres]|order(name asc)[0...$limit]{
    _id,name,"slug":slug.current,place,photo,genres,openToCollaboration,
    "bioText":pt::text(bio),
    studio->{_id,name,"slug":slug.current,website,logo}
  },
  "total": count(*[_type=="creator" && $genre in genres])
}`);

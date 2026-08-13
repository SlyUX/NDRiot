import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { Hero } from '@/components/hero'
import { JsonLd } from '@/components/json-ld'
import { LoadMore } from '@/components/load-more'
import { NewsletterForm } from '@/components/newsletter-form'
import { SaveButton } from '@/components/save-button'
import { organizationSchema, jsonLdGraph, websiteSchema } from '@/lib/structured-data'
import { bookToCard, creatorToCard, mediaToCard, resourceToCard } from '@/lib/card-mappers'
import {
  HOME_ROW_LIMIT,
  bookFilters,
  creatorHomeFilters,
  discoverSeed,
  genreOptions,
  hasActiveFilters,
  homeBookFacets,
  homeCreatorFacets,
  pageLimit,
  randomSeed,
  seededShuffle,
  type SearchParams,
} from '@/lib/filters'
import {
  safeFetch,
  BOOK_IDS_QUERY,
  GENRES_WITH_BOOKS_QUERY,
  HERO_BOOKS_QUERY,
  HOME_NEW_QUERY,
  HOME_RESOURCES_QUERY,
  MEDIA_HOME_QUERY,
  FILTERED_BOOKS_QUERY,
  FILTERED_CREATORS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { auth } from '@/auth'
import { isSaved } from '@/sanity/reader-client'
import { SITE_URL } from '@/lib/site-url'
import type {
  BookSummary,
  CreatorSummary,
  HeroBook,
  HomeNewItem,
  MediaSummary,
  Paginated,
  ResourceSummary,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  // Title/description are inherited from the root layout; the homepage only
  // needs its self-canonical (the origin).
  return { alternates: { canonical: SITE_URL } }
}

/**
 * One random book for the hero spotlight.
 *
 * Random per request, not curated. Every book gets the same odds of the front
 * page, which is the point (AGENTS.md §3): a directory that hand-picks its
 * spotlight is ranking its contributors, and this one deliberately does not.
 *
 * Two queries because GROQ has no random(): fetch identifiers, pick one, fetch
 * only that — cost stays flat as the roster grows.
 */
async function pickFeatureBook(exclude?: string): Promise<HeroBook | null> {
  const ids = await safeFetch<string[]>(BOOK_IDS_QUERY, {}, [])
  if (ids.length === 0) return null

  // "Discover" passes the current book so the next press lands on a different
  // one — unless it is the only book, where there is nothing else to show.
  const pool = exclude ? ids.filter((id) => id !== exclude) : ids
  const from = pool.length ? pool : ids
  const id = from[Math.floor(Math.random() * from.length)]
  const [book] = await safeFetch<HeroBook[]>(HERO_BOOKS_QUERY, { ids: [id] }, [])
  return book ?? null
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  /**
   * Two independent filter rows, one per section.
   *
   * The comics bar owns genre/format/audience/q; the creators bar owns the
   * c-prefixed keys. So narrowing comics no longer silently reorders the
   * creators row — each control sits above the row it governs and changes only
   * that row, which is the whole point of the split. Discover is per-row too
   * (sort/seed for comics, csort/cseed for creators), so one row can be
   * shuffled while the other holds still.
   */
  const booksFilters = bookFilters(params)
  const creatorsFilters = creatorHomeFilters(params)

  const booksFiltering = hasActiveFilters(booksFilters)
  const creatorsFiltering = hasActiveFilters(creatorsFilters)

  const bookSeed = discoverSeed(params, 'sort', 'seed')
  const creatorSeed = discoverSeed(params, 'csort', 'cseed')

  // Browse shows a row's worth; a search on a row grows its own limit. Capped
  // either way, so a 1,000-book roster never lands in one homepage payload.
  // A search opens on two rows and grows a page (two rows) per "Load more".
  const BOOKS_COLS = 5
  const CREATORS_COLS = 4
  const booksPage = 2 * BOOKS_COLS
  const creatorsPage = 2 * CREATORS_COLS
  const booksLimit = booksFiltering ? pageLimit(params, 'blimit', booksPage) : HOME_ROW_LIMIT
  const creatorsLimit = creatorsFiltering
    ? pageLimit(params, 'climit', creatorsPage)
    : HOME_ROW_LIMIT

  // The book the hero last showed, so "Discover" re-rolls to a different one.
  const notFeature = Array.isArray(params.notf) ? params.notf[0] : params.notf

  const [feature, booksResult, creatorsResult, genresWithBooks, newItems, mediaItems, homeResources, settings, session] =
    await Promise.all([
      // Deliberately unfiltered. The hero is the guaranteed route to work
      // nobody went looking for (AGENTS.md §3), so narrowing the page must
      // never narrow it.
      pickFeatureBook(notFeature),
      safeFetch<Paginated<BookSummary>>(
        FILTERED_BOOKS_QUERY,
        { ...booksFilters, limit: booksLimit },
        { items: [], total: 0 },
      ),
      safeFetch<Paginated<CreatorSummary>>(
        FILTERED_CREATORS_QUERY,
        { ...creatorsFilters, limit: creatorsLimit },
        { items: [], total: 0 },
      ),
      safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
      safeFetch<HomeNewItem[]>(HOME_NEW_QUERY, {}, []),
      safeFetch<MediaSummary[]>(MEDIA_HOME_QUERY, {}, []),
      safeFetch<ResourceSummary[]>(HOME_RESOURCES_QUERY, {}, []),
      getSiteSettings(),
      auth(),
    ])
  const books = booksResult.items
  const creators = creatorsResult.items

  // The hero's featured comic is savable too — its saved state, and a Save
  // button passed as a slot so the client component stays out of the server hero.
  const email = session?.user?.email
  const featureSaved = feature && email ? await isSaved(email, feature._id) : false
  const featureSave = feature ? (
    <SaveButton
      // Keyed by the book so Discover swapping the feature remounts the button
      // (its saved state lives in useState, which only reads initialSaved once).
      key={feature._id}
      itemType="book"
      itemId={feature._id}
      initialSaved={featureSaved}
      signedIn={Boolean(email)}
      variant="outline"
      saveLabel={settings.sections.saveLabel}
      savedLabel={settings.sections.savedLabel}
      signInCopy={{
        title: settings.sections.accountSignInTitle,
        body: settings.sections.accountSignInBody,
        cta: settings.sections.accountSignInCta,
      }}
    />
  ) : null

  // Both rows offer the same genres — the set a book actually uses.
  const genres = genreOptions(genresWithBooks)

  const booksBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeBookFacets(genres)}
        control="select"
        collapsible
        resultCount={booksResult.total}
        searchLabel={settings.sections.searchBooksLabel}
        discoverLabel={settings.sections.spinLabel}
      />
    </Suspense>
  )

  const creatorsBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeCreatorFacets(genres)}
        control="select"
        collapsible
        resultCount={creatorsResult.total}
        searchLabel={settings.sections.searchCreatorsLabel}
        discoverLabel={settings.sections.discoverLabel}
        searchParam="cq"
        sortParam="csort"
        seedParam="cseed"
      />
    </Suspense>
  )

  // Default browse is randomly ordered — a fresh, fair rotation each visit, so no
  // title keeps the top spot by its name (AGENTS.md §3: alphabetical was an MVP
  // compromise, not the destination). A search leaves the order alone so Load
  // More doesn't reshuffle under the reader; Spin re-rolls to a specific seed.
  const displayBooks = booksFiltering
    ? books
    : seededShuffle(books, bookSeed ?? randomSeed())
  const displayCreators = creatorsFiltering
    ? creators
    : seededShuffle(creators, creatorSeed ?? randomSeed())

  // "Discover" re-rolls the feature: the same URL with `notf` set to the current
  // book, so the next render excludes it. Carries the other params through.
  const discoverParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    if (Array.isArray(value)) value.forEach((v) => discoverParams.append(key, v))
    else discoverParams.set(key, value)
  }
  if (feature) discoverParams.set('notf', feature._id)

  return (
    <div>
      <JsonLd data={jsonLdGraph(organizationSchema(settings), websiteSchema(settings))} />
      <Hero
        hero={settings.hero}
        feature={feature}
        newItems={newItems}
        discoverHref={feature ? `?${discoverParams.toString()}` : undefined}
        discoverLabel={settings.sections.spinLabel}
        saveSlot={featureSave}
      />

      {/* Newsletter — a full-width pink band directly beneath the hero.
          Black text on the pink (§9); the signup goes straight to MailerLite. */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[90rem] flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:justify-center sm:gap-12 lg:px-0">
          <div className="max-w-xl">
            <h2 className="text-2xl font-black tracking-tighter uppercase sm:text-3xl">
              {settings.newsletter.heading}
            </h2>
            <p className="mt-1 text-sm text-black">{settings.newsletter.description}</p>
          </div>
          <div className="w-full sm:max-w-md">
            <NewsletterForm copy={settings.newsletter} variant="band" />
          </div>
        </div>
      </section>

      {/* Books: one scrolling row while browsing; a two-row grid with "Load
          more" once a search narrows it. "View all" links to the full listing. */}
      <ContentCardGrid
        heading={settings.home.booksHeading}
        toolbar={booksBar}
        cards={displayBooks.map(bookToCard)}
        columns={BOOKS_COLS}
        scroll={!booksFiltering}
        scrollRows={2}
        footer={
          booksFiltering ? (
            <LoadMore
              searchParams={params}
              param="blimit"
              shown={books.length}
              total={booksResult.total}
              pageSize={booksPage}
            />
          ) : undefined
        }
        padding="md"
        viewAllHref="/books"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={booksFiltering ? settings.empty.filteredBooks : settings.empty.books}
      />

      {/* Creators: wide horizontal cards. Same browse-scroll / search-grid split
          as the books row above. */}
      <ContentCardGrid
        heading={settings.home.creatorsHeading}
        toolbar={creatorsBar}
        cards={displayCreators.map(creatorToCard)}
        layout="horizontal"
        columns={CREATORS_COLS}
        summaryLines={4}
        scroll={!creatorsFiltering}
        footer={
          creatorsFiltering ? (
            <LoadMore
              searchParams={params}
              param="climit"
              shown={creators.length}
              total={creatorsResult.total}
              pageSize={creatorsPage}
            />
          ) : undefined
        }
        padding="md"
        background="charcoal"
        viewAllHref="/creators"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={creatorsFiltering ? settings.empty.filteredCreators : settings.empty.creators}
      />

      {/* Resources: recent resources, where the editorial row used to sit — same
          horizontal scroll, on the black surface between the two charcoal bands.
          Hidden when there are none. */}
      {homeResources.length > 0 && (
        <ContentCardGrid
          heading={settings.home.resourcesHeading}
          cards={homeResources.map(resourceToCard)}
          layout="horizontal"
          columns={4}
          aspectRatio="landscape"
          summaryLines={3}
          scroll
          padding="md"
          viewAllHref="/resources"
          viewAllLabel={settings.home.viewAllLabel}
          emptyMessage=""
        />
      )}

      {/* Media: independent outlets covering indie comics. Bottom row, a
          scrolling taste; the full list (and the disclaimer) is on /media.
          Hidden when there is none, like editorial. */}
      {mediaItems.length > 0 && (
        <ContentCardGrid
          heading={settings.home.mediaHeading}
          cards={mediaItems.map(mediaToCard)}
          layout="horizontal"
          columns={4}
          aspectRatio="square"
          summaryLines={3}
          scroll
          padding="md"
          background="charcoal"
          viewAllHref="/media"
          viewAllLabel={settings.home.viewAllLabel}
          emptyMessage=""
        />
      )}
    </div>
  )
}

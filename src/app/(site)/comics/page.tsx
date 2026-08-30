import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { ContentCardGrid } from '@/components/content-card-grid'
import { FilterBar } from '@/components/filter-bar'
import { LoadMore } from '@/components/load-more'
import { StripGallery } from '@/components/strip-gallery'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { cn } from '@/lib/utils'
import {
  PAGE_SIZE,
  SHUFFLE_CAP,
  bookFacets,
  bookFilters,
  discoverSeed,
  genreOptions,
  hasActiveFilters,
  pageLimit,
  randomSeed,
  seededShuffle,
  stripFacets,
  stripFilters,
  type SearchParams,
} from '@/lib/filters'
import { pageMetadata } from '@/lib/page-metadata'
import {
  safeFetch,
  BOOKS_QUERY,
  FILTERED_BOOKS_QUERY,
  GENRES_WITH_BOOKS_QUERY,
  FILTERED_STRIPS_QUERY,
  STRIP_SERIES_OPTIONS_QUERY,
  STRIP_CREATOR_OPTIONS_QUERY,
} from '@/lib/queries'
import { auth } from '@/auth'
import { savedItems } from '@/sanity/reader-client'
import { getSiteSettings, type SiteSettings } from '@/lib/site-settings'
import type { BookSummary, Paginated, StripSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  // Canonical is the bare /comics — so the filter permutations (?genre=…&sort=…)
  // all fold into one ranking target rather than splitting it.
  return pageMetadata({
    title: settings.sections.booksHeading,
    description: settings.sections.booksDescription,
    path: '/comics',
    siteTitle: settings.siteTitle,
    feeds: [{ url: '/feeds/comics.xml', title: settings.sections.booksHeading }],
  })
}

/** Comics ↔ Strips tab switcher — books link out, strips read here. */
function TabBar({
  active,
  settings,
}: {
  active: 'comics' | 'strips'
  settings: SiteSettings
}) {
  const tab = (label: string, href: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-ring border-b-2 px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isActive
          ? 'border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent',
      )}
    >
      {label}
    </Link>
  )
  return (
    <div className="border-border mt-6 flex gap-1 border-b">
      {tab(settings.sections.booksHeading, '/comics', active === 'comics')}
      {tab(settings.sections.stripsHeading, '/comics?tab=strips', active === 'strips')}
    </div>
  )
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // The Strips tab — single-page comics hosted here (read now), a different
  // reading model from the link-out books, so it's a sibling tab, not mixed in.
  const onStrips =
    (Array.isArray(params.tab) ? params.tab[0] : params.tab) === 'strips'
  if (onStrips) {
    const [seriesOptions, creatorOptions, settings, session] = await Promise.all([
      safeFetch<{ title: string | null; slug: string | null }[]>(
        STRIP_SERIES_OPTIONS_QUERY,
        {},
        [],
      ),
      safeFetch<{ name: string | null; slug: string | null }[]>(
        STRIP_CREATOR_OPTIONS_QUERY,
        {},
        [],
      ),
      getSiteSettings(),
      auth(),
    ])

    const stripQuery = stripFilters(params, seriesOptions, creatorOptions)
    const stripFiltering = hasActiveFilters(stripQuery)
    // Recency by default; the FilterBar's shuffle action reorders to random
    // (§3, user-directed). No Load More on strips, so the seed need not persist.
    const stripSeed = discoverSeed(params, 'sort', 'seed')
    const stripResult = await safeFetch<StripSummary[]>(
      FILTERED_STRIPS_QUERY,
      stripQuery,
      [],
    )
    const strips =
      stripSeed === null ? stripResult : seededShuffle(stripResult, stripSeed)

    // Card + reader Save (§3, explicit only). The signed-in reader's saved strip
    // ids seed each chip; signed out, a tap opens the sign-in modal.
    const stripEmail = session?.user?.email ?? null
    const savedStripIds = stripEmail
      ? (await savedItems(stripEmail))
          .filter((x) => x.itemType === 'strip')
          .map((x) => x.itemId)
      : []
    const stripSave = {
      signedIn: Boolean(stripEmail),
      savedIds: savedStripIds,
      saveLabel: settings.sections.followLabel,
      savedLabel: settings.sections.followingLabel,
      signInCopy: {
        title: settings.sections.accountSignInTitle,
        body: settings.sections.accountSignInBody,
        cta: settings.sections.accountSignInCta,
      },
    }

    return (
      <div>
        <Section as="header" padding="md" className="pb-6">
          <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
            {settings.sections.stripsHeading}
          </h1>
          <TabBar active="strips" settings={settings} />
          <Suspense fallback={null}>
            <FilterBar
              facets={stripFacets(
                seriesOptions.map((s) => s.title).filter((t): t is string => Boolean(t)),
                creatorOptions.map((c) => c.name).filter((n): n is string => Boolean(n)),
              )}
              resultCount={strips.length}
              searchLabel={settings.sections.searchStripsLabel}
              discoverLabel={settings.sections.stripsShuffleLabel}
              showDiscoverText
              control="select"
              collapsible
              className="mt-8"
            />
          </Suspense>
        </Section>
        <StripGallery
          strips={strips}
          save={stripSave}
          partOfLabel={settings.sections.seriesPartOfLabel}
          columns={5}
          padding="md"
          gridClassName="pt-6"
          emptyMessage={
            stripFiltering ? settings.empty.filteredStrips : settings.empty.strips
          }
        />
      </div>
    )
  }

  const filters = bookFilters(params)
  const filtering = hasActiveFilters(filters)
  const limit = pageLimit(params)
  // Unfiltered browse is randomly ordered (§3: alphabetical was an MVP
  // compromise) — seeded so Load More is stable (the seed rides the Load More
  // URL). Filtering keeps query order so a narrowed set doesn't reshuffle as you
  // page. Fetch the whole set when shuffling, then slice to the page.
  const seed = filtering ? null : (discoverSeed(params, 'sort', 'seed') ?? randomSeed())

  const [result, genresWithBooks, settings, session] = await Promise.all([
    safeFetch<Paginated<BookSummary>>(
      FILTERED_BOOKS_QUERY,
      { ...filters, limit: seed === null ? limit : SHUFFLE_CAP },
      { items: [], total: 0 },
    ),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
    getSiteSettings(),
    auth(),
  ])
  const books = seed === null ? result.items : seededShuffle(result.items, seed).slice(0, limit)

  // Card-level Save (§3: explicit only). The signed-in reader's saved book ids
  // seed each chip; signed out, tapping a chip opens the sign-in modal.
  const email = session?.user?.email ?? null
  const savedIds = email
    ? (await savedItems(email))
        .filter((x) => x.itemType === 'book')
        .map((x) => x.itemId)
    : []
  const saveConfig = {
    signedIn: Boolean(email),
    savedIds,
    saveLabel: settings.sections.followLabel,
    savedLabel: settings.sections.followingLabel,
    signInCopy: {
      title: settings.sections.accountSignInTitle,
      body: settings.sections.accountSignInBody,
      cta: settings.sections.accountSignInCta,
    },
  }

  // Only fetched when filtering emptied the page. An empty result is a
  // discovery moment, not an error (AGENTS.md §3) — so offer the rest of the
  // shelf rather than a dead end.
  const fallback =
    filtering && books.length === 0
      ? await safeFetch<BookSummary[]>(BOOKS_QUERY, {}, [])
      : []

  return (
    <div>
      {/* pb-6 here + pt-6 on the grid halves the gap between two `md` bands, so
          the filters and the results they govern read as one group rather than
          two stacked sections (AGENTS.md §3 — the filter is the interface). */}
      <Section as="header" padding="md" className="pb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {settings.sections.booksHeading}
        </h1>
        <TabBar active="comics" settings={settings} />
        <Suspense fallback={null}>
          <FilterBar facets={bookFacets(genreOptions(genresWithBooks))} resultCount={result.total}
            searchLabel={settings.sections.searchBooksLabel}
            control="select"
            collapsible
            className="mt-8" />
        </Suspense>
      </Section>

      <ContentCardGrid
        cards={books.map(bookToCard)}
        save={saveConfig}
        columns={5}
        padding="md"
        className="pt-6"
        footer={
          <LoadMore
            // Carry the seed so paging re-renders the same shuffle, just deeper.
            searchParams={seed === null ? params : { ...params, sort: 'random', seed: String(seed) }}
            shown={books.length}
            total={result.total}
            pageSize={PAGE_SIZE}
          />
        }
        emptyMessage={
          filtering ? settings.empty.filteredBooks : settings.empty.books
        }
        emptyEmphasis={filtering}
      />

      {fallback.length > 0 && (
        <ContentCardGrid
          heading={settings.sections.everythingElseHeading}
          headingSize="sm"
          cards={fallback.slice(0, 8).map(bookToCard)}
          save={saveConfig}
          columns={5}
          padding="md"
          emptyMessage={settings.empty.books}
        />
      )}
    </div>
  )
}

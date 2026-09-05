import type { Metadata } from "next";
import { Suspense } from "react";
import { Check } from "lucide-react";

import { ContentCardGrid } from "@/components/content-card-grid";
import { ForCreatorsRow } from "@/components/for-creators-row";
import { ShuffleRow } from "@/components/shuffle-row";
import { FilterBar } from "@/components/filter-bar";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { LoadMore } from "@/components/load-more";
import { NewsletterForm } from "@/components/newsletter-form";
import {
  organizationSchema,
  jsonLdGraph,
  websiteSchema,
} from "@/lib/structured-data";
import { bookToCard, creatorToCard, stripToCard } from "@/lib/card-mappers";
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
} from "@/lib/filters";
import {
  safeFetch,
  GENRES_WITH_BOOKS_QUERY,
  HOME_NEW_QUERY,
  STRIPS_QUERY,
  FILTERED_BOOKS_QUERY,
  FILTERED_CREATORS_QUERY,
  RAIL_UPDATES_QUERY,
  APPEARANCE_FEED_QUERY,
  CREATOR_HERO_QUERY,
} from "@/lib/queries";
import { appearanceToRailItem, mergeFeed } from "@/lib/feed-mappers";
import {
  pickHeroBooks,
  annotateHeroItems,
  type HeroFeatureItem,
} from "@/lib/hero-queue";
import { getSiteSettings } from "@/lib/site-settings";
import { auth } from "@/auth";
import { savedItems } from "@/sanity/reader-client";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import { SITE_URL } from "@/lib/site-url";
import type {
  BookSummary,
  CreatorSummary,
  HomeNewItem,
  StripSummary,
  AppearanceFeedRow,
  Paginated,
  RailFeedItem,
  RailUpdate,
} from "@/lib/types";

/** How many updates the hero rail holds before scrolling. */
const RAIL_LIMIT = 20;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Title/description are inherited from the root layout; the homepage only
  // needs its self-canonical (the origin).
  return { alternates: { canonical: SITE_URL } };
}

/** How many hero picks to preload for instant, fair spins (see hero-queue.ts). */
const HERO_QUEUE_SIZE = 8;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

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
  const booksFilters = bookFilters(params);
  const creatorsFilters = creatorHomeFilters(params);

  const booksFiltering = hasActiveFilters(booksFilters);
  const creatorsFiltering = hasActiveFilters(creatorsFilters);

  const bookSeed = discoverSeed(params, "sort", "seed");
  const creatorSeed = discoverSeed(params, "csort", "cseed");

  // Browse shows a row's worth; a search on a row grows its own limit. Capped
  // either way, so a 1,000-book roster never lands in one homepage payload.
  // A search opens on two rows and grows a page (two rows) per "Load more".
  const BOOKS_COLS = 5;
  const CREATORS_COLS = 4;
  const booksPage = 2 * BOOKS_COLS;
  const creatorsPage = 2 * CREATORS_COLS;
  const booksLimit = booksFiltering
    ? pageLimit(params, "blimit", booksPage)
    : HOME_ROW_LIMIT;
  const creatorsLimit = creatorsFiltering
    ? pageLimit(params, "climit", creatorsPage)
    : HOME_ROW_LIMIT;

  const [
    heroBooks,
    booksResult,
    creatorsResult,
    genresWithBooks,
    newItems,
    strips,
    settings,
    session,
  ] = await Promise.all([
    // A preloaded queue of uniform-random picks for the instant hero. Deliberately
    // unfiltered — the hero is the guaranteed route to work nobody went looking
    // for (§3), so narrowing the page never narrows it. The queue is client
    // state, so it also can't be disturbed by a row shuffle.
    pickHeroBooks(HERO_QUEUE_SIZE),
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
    safeFetch<StripSummary[]>(STRIPS_QUERY, {}, []),
    getSiteSettings(),
    auth(),
  ]);
  const books = booksResult.items;
  const creators = creatorsResult.items;

  // Effective seed per row: the URL's when a shuffle is active, else a fresh one
  // (a new order each visit). Each row's shuffle now reorders on the client
  // (ShuffleRow), so a shuffle touches only its own row with no pinning; this
  // just seeds the initial server-rendered order.
  const effBookSeed = bookSeed ?? randomSeed();
  const effCreatorSeed = creatorSeed ?? randomSeed();

  const email = session?.user?.email;

  // The rail's updates section — updates from creators/comics this reader
  // follows, newest first. A follow-benefit, so it only appears for a signed-in
  // reader with follows; everyone else gets the New Creators & Books rail alone.
  // Per-session, so who you follow never leaks past the request; no follow counts.
  let followedUpdates: RailUpdate[] = [];
  // Hoisted so the hero queue can tag each pick with this viewer's state — which
  // books they've saved, and which creators they own (no Save on your own work).
  let ownedCreatorIds: string[] = [];
  let savedBookIds = new Set<string>();
  // The signed-in creator's profile name + slug (hero greeting + "Your Public
  // Profile" link).
  let profile: { name: string; slug: string } | null = null;
  if (email) {
    const [saves, owned] = await Promise.all([
      savedItems(email),
      creatorsOwnedBy(email),
    ]);
    ownedCreatorIds = owned;
    savedBookIds = new Set(
      saves.filter((s) => s.itemType === "book").map((s) => s.itemId),
    );
    if (ownedCreatorIds.length) {
      profile = await safeFetch<{ name: string; slug: string } | null>(
        CREATOR_HERO_QUERY,
        { id: ownedCreatorIds[0] },
        null,
      );
    }
    const savedIds = saves.map((save) => save.itemId);
    if (savedIds.length) {
      // Updates + convention appearances by followed creators, merged newest-first.
      const [posts, appearances] = await Promise.all([
        safeFetch<RailUpdate[]>(
          RAIL_UPDATES_QUERY,
          { ids: savedIds, limit: RAIL_LIMIT },
          [],
        ),
        safeFetch<AppearanceFeedRow[]>(
          APPEARANCE_FEED_QUERY,
          { ids: savedIds, limit: RAIL_LIMIT },
          [],
        ),
      ]);
      followedUpdates = mergeFeed(
        posts,
        appearances.map((a) =>
          appearanceToRailItem(a, settings.sections.conventionFeedBody),
        ),
        RAIL_LIMIT,
      );
    }
  }
  const feedItems: RailFeedItem[] = followedUpdates.map((update) => ({
    ...update,
    followed: true,
  }));
  const feedHeading = settings.sections.feedMineHeading;
  // Signed-in hero: greet by the reader's ND Riot profile first name (the name
  // they entered), falling back to their Google account name for a plain
  // reader; give them a Dashboard link, plus their public profile if a creator.
  const firstName = (profile?.name ?? session?.user?.name ?? "")
    .trim()
    .split(/\s+/)[0];
  const account = email
    ? {
        greeting: settings.hero.loggedInGreeting
          .replace("{name}", firstName)
          .replace(/,\s*$/, "")
          .trim(),
        ctas: [
          { label: settings.hero.loggedInDashboardLabel, href: "/me" },
          ...(profile?.slug
            ? [
                {
                  label: settings.hero.loggedInProfileLabel,
                  href: `/creators/${profile.slug}`,
                },
              ]
            : []),
        ],
      }
    : undefined;
  // The hero queue, tagged with this viewer's save/ownership state (§3 fairness
  // in hero-queue.ts). [0] is the server-rendered first pick; SpinnerRack cycles
  // the rest instantly and refills in the background.
  const heroItems: HeroFeatureItem[] = annotateHeroItems(
    heroBooks,
    savedBookIds,
    ownedCreatorIds,
  );
  const heroSave = {
    signedIn: Boolean(email),
    saveLabel: settings.sections.followLabel,
    savedLabel: settings.sections.followingLabel,
    signInCopy: {
      title: settings.sections.accountSignInTitle,
      body: settings.sections.accountSignInBody,
      cta: settings.sections.accountSignInCta,
    },
  };

  // Both rows offer the same genres — the set a book actually uses.
  const genres = genreOptions(genresWithBooks);

  const booksBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeBookFacets(genres)}
        control="select"
        resultCount={booksResult.total}
        searchLabel={settings.sections.searchBooksLabel}
      />
    </Suspense>
  );

  const creatorsBar = (
    <Suspense fallback={null}>
      <FilterBar
        facets={homeCreatorFacets(genres)}
        control="select"
        resultCount={creatorsResult.total}
        searchLabel={settings.sections.searchCreatorsLabel}
        searchParam="cq"
        sortParam="csort"
        seedParam="cseed"
      />
    </Suspense>
  );

  // Default browse is randomly ordered — a fresh, fair rotation each visit, so no
  // title keeps the top spot by its name (AGENTS.md §3: alphabetical was an MVP
  // compromise, not the destination). Rows reshuffle on the client (ShuffleRow).
  const displayBooks = booksFiltering
    ? books
    : seededShuffle(books, effBookSeed);
  const displayCreators = creatorsFiltering
    ? creators
    : seededShuffle(creators, effCreatorSeed);


  // The pink newsletter band, rendered in two positions and toggled by
  // breakpoint: after the hero on desktop, after the Comics row on phones.
  const newsletterBand = (
    <div className="mx-auto flex max-w-[90rem] flex-col gap-6 px-6 py-10 text-left sm:flex-row sm:items-start sm:justify-center sm:gap-12 lg:px-0">
      {/* Left column: the heading + what each issue carries. */}
      <div className="max-w-xl">
        <h2 className="text-2xl font-black tracking-tighter uppercase sm:text-3xl">
          {settings.newsletter.heading}
        </h2>
        {settings.newsletter.items.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-black">
            {settings.newsletter.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Right column: the pitch, then the form directly beneath it. */}
      <div className="w-full space-y-3 sm:max-w-md">
        <p className="text-sm text-black">{settings.newsletter.description}</p>
        <NewsletterForm copy={settings.newsletter} variant="band" />
      </div>
    </div>
  );

  return (
    <div>
      <JsonLd
        data={jsonLdGraph(
          organizationSchema(settings),
          websiteSchema(settings),
        )}
      />
      <Hero
        hero={settings.hero}
        heroItems={heroItems}
        heroSave={heroSave}
        newItems={newItems}
        feedItems={feedItems}
        feedHeading={feedHeading}
        discoverLabel={settings.sections.spinLabel}
        account={account}
      />

      {/* Newsletter band — beneath the hero on desktop; on phones the copy
          below moves under the Comics row. §9 pink. */}
      <section className="bg-primary text-primary-foreground max-md:hidden">
        {newsletterBand}
      </section>

      {/* Each row sets its own background explicitly (§9): Comics on --background,
          Comic Creators on --surface-alt, For Creators on --background, Strips on
          --surface-alt. Explicit (not auto-alternated) because the interactive
          rows are ShuffleRow/ForCreatorsRow, not bare Sections. */}
      <>
        {/* Books: one scrolling row while browsing; a two-row grid with "Load
            more" once a search narrows it. "View all" links to the full listing. */}
        <ShuffleRow
          // Keyed by content (order-independent): a filter change (new books)
          // remounts + re-seeds; a client reshuffle (same books) does not, and
          // the other row's filtering never disturbs this order.
          key={displayBooks
            .map((book) => book._id)
            .sort()
            .join(",")}
          heading={settings.home.booksHeading}
          background="background"
          spinLabel={settings.sections.rowSpinLabel}
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
          viewAllHref="/comics"
          viewAllLabel={settings.home.viewAllLabel}
          emptyMessage={
            booksFiltering ? settings.empty.filteredBooks : settings.empty.books
          }
        />

        {/* Newsletter band on phones only — sits after Comics (a raw <section>
            between the explicit-background rows). */}
        <section className="bg-primary text-primary-foreground md:hidden">
          {newsletterBand}
        </section>

        {/* Creators: wide horizontal cards. Same browse-scroll / search-grid split
            as the books row above. */}
        <ShuffleRow
          key={displayCreators
            .map((creator) => creator._id)
            .sort()
            .join(",")}
          heading={settings.home.creatorsHeading}
          background="alt"
          spinLabel={settings.sections.rowSpinLabel}
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
          viewAllHref="/creators"
          viewAllLabel={settings.home.viewAllLabel}
          emptyMessage={
            creatorsFiltering
              ? settings.empty.filteredCreators
              : settings.empty.creators
          }
        />

        {/* For Creators: a funnel beneath Creators — one card each for
            Conventions, Resources, Media, and Allies (icon + blurb → section),
            in place of the old on-home listing rows. */}
        <ForCreatorsRow
          heading={settings.home.forCreatorsHeading}
          cards={settings.home.forCreators}
          background="background"
        />

        {/* Strips: single-page comics you can read right here. A scrolling
            taste, newest first (§3: recency, never ranked); shows once there
            are enough of them, and the full set is the Comics page's Strips tab. */}
        {strips.length >= 3 && (
          <ContentCardGrid
            heading={settings.sections.stripsHeading}
            background="alt"
            cards={strips.slice(0, 8).map(stripToCard)}
            aspectRatio="cover"
            columns={5}
            scroll
            padding="md"
            viewAllHref="/comics?tab=strips"
            viewAllLabel={settings.home.viewAllLabel}
            emptyMessage=""
          />
        )}
      </>
    </div>
  );
}

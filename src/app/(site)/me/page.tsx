import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AlternatingSections } from "@/components/alternating-sections";
import { SignInButton, SignOutButton } from "@/components/auth-controls";
import {
  CollabRequests,
  type IncomingCollab,
  type SentCollab,
} from "@/components/collab-requests";
import { EventDialog } from "@/components/event-dialog";
import { EventsManager } from "@/components/events-manager";
import { InitialsAvatar } from "@/components/initials-avatar";
import { NewsletterOptIn } from "@/components/newsletter-opt-in";
import { OwnerTabs } from "@/components/owner-tabs";
import { SavedItemRow } from "@/components/saved-item-row";
import { SectionHeading } from "@/components/section-heading";
import { TabbedPanel, type PanelTab } from "@/components/tabbed-panel";
import { Plus, Pencil } from "lucide-react";
import { StripComposer } from "@/components/strip-composer";
import {
  type ComposerTarget,
  type MentionOption,
} from "@/components/update-composer";
import { PostUpdateDialog } from "@/components/post-update-dialog";
import { UpdateFeed } from "@/components/update-feed";
import {
  YourComics,
  type YourComicsBook,
  type YourComicsStrip,
} from "@/components/your-comics";
import { composerLabelsFrom, updateOwnerConfig } from "@/lib/composer-labels";
import { isSubscribedToNewsletter } from "@/lib/mailerlite";
import { formatPlace } from "@/lib/place";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { auth } from "@/auth";
import { UPDATE_KINDS } from "@/lib/taxonomy";
import {
  safeFetch,
  freshFetch,
  BOOKS_QUERY,
  CONVENTIONS_QUERY,
  CREATORS_QUERY,
  CREATOR_STRIPS_QUERY,
  MEDIA_QUERY,
  OWNED_APPEARANCES_QUERY,
  INTAKE_OWNED_SERIES_QUERY,
  OWNED_BOOKS_QUERY,
  OWNED_COSIGNS_QUERY,
  OWNED_DOCS_QUERY,
  OWNED_MEDIA_QUERY,
  SAVED_BOOKS_QUERY,
  SAVED_CREATORS_QUERY,
  UPDATES_FEED_QUERY,
  APPEARANCE_FEED_QUERY,
  COLLAB_CREATORS_QUERY,
} from "@/lib/queries";
import { appearanceToFeedItem, mergeFeed } from "@/lib/feed-mappers";
import { getSiteSettings } from "@/lib/site-settings";
import { ownedDocIds } from "@/sanity/ownership-client";
import { incomingRequests, sentRequests } from "@/sanity/collab-client";
import { savedItems } from "@/sanity/reader-client";
import { urlFor } from "@/sanity/image";
import type {
  BookSummary,
  ConventionSummary,
  CosignCreator,
  CreatorSummary,
  StripSummary,
  MediaSummary,
  OwnedAppearance,
  UpdateFeedItem,
  AppearanceFeedRow,
} from "@/lib/types";

/**
 * The signed-in reader's home.
 *
 * A creator's identity + comics live together in a personalization-teal "creator
 * zone" (--personalize, §9) up top; media they own and their saved shelf follow
 * on the plain surface. Every list is a compact two-column feed; saved items
 * carry a Remove. Nothing inferred, ranked, or recommended (§3). Never
 * indexed.
 */
export const dynamic = "force-dynamic";

/** Owned creators/media, resolved for the manage links (local shape, like the join pages). */
type OwnedDoc = {
  _id: string;
  _type: string;
  name: string | null;
  slug: string | null;
};

/** Every feed-style list here: three on desktop, two on portrait tablet, one on mobile. */
const FEED_GRID = "grid grid-cols-1 gap-x-8 md:grid-cols-2 lg:grid-cols-3";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.sections.accountTitle} · ${settings.siteTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage() {
  const [settings, session] = await Promise.all([getSiteSettings(), auth()]);
  const s = settings.sections;
  const email = session?.user?.email;

  // Signed out: a plain invitation, not a wall.
  if (!email) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-3xl font-black tracking-tighter uppercase">
          {s.accountSignInTitle}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm">
          {s.accountSignInBody}
        </p>
        <div className="mt-6">
          <SignInButton label={s.accountSignInCta} redirectTo="/me" />
        </div>
      </Section>
    );
  }

  const saves = await savedItems(email);
  const bookIds = saves
    .filter((x) => x.itemType === "book")
    .map((x) => x.itemId);
  const creatorIds = saves
    .filter((x) => x.itemType === "creator")
    .map((x) => x.itemId);

  // Owned docs resolve to their type first, so comics can be looked up by the
  // creator ids they belong to and media by their own ids.
  const ownedIds = await ownedDocIds(email);
  const ownedDocs = ownedIds.length
    ? await safeFetch<OwnedDoc[]>(OWNED_DOCS_QUERY, { ids: ownedIds }, [])
    : [];
  const ownedCreatorIds = ownedDocs
    .filter((d) => d._type === "creator")
    .map((d) => d._id);
  const ownedMediaIds = ownedDocs
    .filter((d) => d._type === "media")
    .map((d) => d._id);

  // The reader's update feed — everything they saved is a follow (§3). Newest
  // first, capped; recency only, never ranked.
  const followIds = [...bookIds, ...creatorIds];

  const [
    savedBooks,
    savedCreators,
    ownedCreators,
    ownedBooks,
    ownedMedia,
    feedPosts,
    feedAppearances,
  ] = await Promise.all([
    bookIds.length
      ? safeFetch<BookSummary[]>(SAVED_BOOKS_QUERY, { ids: bookIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    creatorIds.length
      ? safeFetch<CreatorSummary[]>(
          SAVED_CREATORS_QUERY,
          { ids: creatorIds },
          [],
        )
      : Promise.resolve<CreatorSummary[]>([]),
    ownedCreatorIds.length
      ? safeFetch<CreatorSummary[]>(
          SAVED_CREATORS_QUERY,
          { ids: ownedCreatorIds },
          [],
        )
      : Promise.resolve<CreatorSummary[]>([]),
    ownedCreatorIds.length
      ? safeFetch<BookSummary[]>(
          OWNED_BOOKS_QUERY,
          { ids: ownedCreatorIds },
          [],
        )
      : Promise.resolve<BookSummary[]>([]),
    ownedMediaIds.length
      ? safeFetch<MediaSummary[]>(OWNED_MEDIA_QUERY, { ids: ownedMediaIds }, [])
      : Promise.resolve<MediaSummary[]>([]),
    followIds.length
      ? safeFetch<UpdateFeedItem[]>(
          UPDATES_FEED_QUERY,
          { ids: followIds, limit: 30 },
          [],
        )
      : Promise.resolve<UpdateFeedItem[]>([]),
    followIds.length
      ? safeFetch<AppearanceFeedRow[]>(
          APPEARANCE_FEED_QUERY,
          { ids: followIds, limit: 30 },
          [],
        )
      : Promise.resolve<AppearanceFeedRow[]>([]),
  ]);

  // Your Feed = followed creators' updates + their convention appearances,
  // merged newest-first (§3: recency only).
  const updates = mergeFeed(
    feedPosts,
    feedAppearances.map((a) => appearanceToFeedItem(a, s.conventionFeedBody)),
    30,
  );

  const isCreator = ownedCreators.length > 0;
  const hasSaves = savedBooks.length > 0 || savedCreators.length > 0;
  // Hide the ND Noise opt-in from anyone already subscribed (MailerLite live).
  const newsletterSubscribed = await isSubscribedToNewsletter(email);
  // The creators this creator has Cosigned — the dashboard's Cosigns tab. A
  // dangling reference resolves to null, so drop those.
  const cosigns = (
    isCreator
      ? await safeFetch<CosignCreator[]>(OWNED_COSIGNS_QUERY, { id: ownedCreatorIds[0] }, [])
      : []
  ).filter((c): c is NonNullable<CosignCreator> => c != null);

  // The creators' existing (published) series — the strip composer's dropdown,
  // filtered per creator at render. Drafts a creator just started show up once
  // published; the composer's "new series" field covers the interim.
  const ownedSeries = ownedCreatorIds.length
    ? await safeFetch<{ _id: string; title: string | null; creatorId: string | null }[]>(
        INTAKE_OWNED_SERIES_QUERY,
        { ids: ownedCreatorIds },
        [],
      )
    : [];

  // Collaboration requests — incoming (respond) + sent (status). Creator-only;
  // the private request docs resolve to public identities via COLLAB_CREATORS_QUERY.
  let incomingCollab: IncomingCollab[] = [];
  let sentCollab: SentCollab[] = [];
  if (isCreator) {
    const myCreatorId = ownedCreatorIds[0];
    const [incoming, sent] = await Promise.all([
      incomingRequests(myCreatorId),
      sentRequests(myCreatorId),
    ]);
    const otherIds = [
      ...new Set([
        ...incoming.map((r) => r.fromId),
        ...sent.map((r) => r.toId),
      ]),
    ];
    const others = otherIds.length
      ? await safeFetch<
          { _id: string; name: string | null; slug: string | null }[]
        >(COLLAB_CREATORS_QUERY, { ids: otherIds }, [])
      : [];
    const byId = new Map(others.map((c) => [c._id, c]));
    incomingCollab = incoming.map((r) => ({
      fromId: r.fromId,
      name: byId.get(r.fromId)?.name ?? "A creator",
      slug: byId.get(r.fromId)?.slug ?? null,
      genre: r.genre,
      status: r.status,
      response: r.response,
    }));
    sentCollab = sent.map((r) => ({
      name: byId.get(r.toId)?.name ?? "A creator",
      slug: byId.get(r.toId)?.slug ?? null,
      genre: r.genre,
      status: r.status,
      response: r.response,
    }));
  }

  // Your Updates — the creator's own posts (updates targeting a creator or comic
  // they own), for the dashboard. Owner-editable, same as on the profile.
  const ownedTargetIds = [
    ...ownedCreatorIds,
    ...ownedBooks.map((book) => book._id),
  ];
  const myUpdates = ownedTargetIds.length
    ? await safeFetch<UpdateFeedItem[]>(
        UPDATES_FEED_QUERY,
        { ids: ownedTargetIds, limit: 30 },
        [],
      )
    : [];

  // Precomputed for the Your Comics rail (a client component takes plain data).
  const yourComicsBooks: YourComicsBook[] = ownedBooks.map((book) => ({
    id: book._id,
    title: book.title ?? "Untitled",
    href: book.slug ? `/comics/${book.slug}` : null,
    editHref: `/join/comics?editing=${encodeURIComponent(book._id)}`,
    coverUrl: book.cover ? urlFor(book.cover).width(300).url() : null,
  }));

  // The creator's strips, shown in the same rail as their comics — each with an
  // edit chip that opens the composer pre-filled (same deps as the create one).
  const stripComposerCreator = {
    _id: ownedCreatorIds[0] ?? "",
    name: ownedCreators[0]?.name ?? "Your profile",
  };
  const stripComposerSeries = ownedSeries
    .filter((se) => se.creatorId === ownedCreatorIds[0])
    .map((se) => ({ _id: se._id, title: se.title ?? "Untitled series" }));
  const yourStrips: YourComicsStrip[] = (
    ownedCreatorIds.length
      ? await safeFetch<StripSummary[]>(
          CREATOR_STRIPS_QUERY,
          { id: ownedCreatorIds[0] },
          [],
        )
      : []
  )
    .filter((strip) => strip.slug)
    .map((strip) => ({
      id: strip._id,
      title: strip.title,
      href: `/strips/${strip.slug}`,
      imageUrl: urlFor(strip.image).width(320).url(),
      width: strip.dimensions?.width ?? 800,
      height: strip.dimensions?.height ?? 600,
      editTrigger: (
        <StripComposer
          copy={settings.stripIntake}
          common={settings.creatorIntake}
          reviewNotice={settings.reviewNotice}
          creator={stripComposerCreator}
          series={stripComposerSeries}
          initial={{
            updateId: strip._id,
            title: strip.title,
            caption: strip.caption ?? "",
            imageAlt: strip.image?.alt ?? "",
            genre: strip.genres?.[0] ?? "",
            maturity: strip.maturity ?? "",
            seriesId: strip.seriesId ?? null,
            imageUrl: urlFor(strip.image).width(600).url(),
          }}
          trigger={
            <button
              type="button"
              aria-label={`${s.accountEditLabel} — ${strip.title}`}
              className="focus-visible:ring-ring inline-flex bg-black/70 p-1.5 text-white transition-colors hover:text-white/70 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
            </button>
          }
        />
      ),
    }));

  // What a creator can post about: each creator they own, plus each of those
  // creators' comics. The action re-checks ownership — this only shapes the picker.
  const composerTargets: ComposerTarget[] = [
    ...ownedCreators.map((creator) => ({
      id: creator._id,
      label: creator.name ?? "Your profile",
      group: "creator" as const,
    })),
    ...ownedBooks.map((book) => ({
      id: book._id,
      label: book.title ?? "Untitled",
      group: "comic" as const,
    })),
  ];

  // Mentionable creators + conventions for the composer, the events-manager's
  // convention list, and the creator's current appearances — only fetched when
  // this reader is a creator (the composer + manager are shown).
  let mentionOptions: MentionOption[] = [];
  let eventConventions: { id: string; name: string }[] = [];
  let ownedAppearances: OwnedAppearance[] = [];
  if (composerTargets.length > 0) {
    const [allCreators, allBooks, allConventions, allMedia, appearances] =
      await Promise.all([
        safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, []),
        safeFetch<BookSummary[]>(BOOKS_QUERY, {}, []),
        safeFetch<ConventionSummary[]>(CONVENTIONS_QUERY, {}, []),
        safeFetch<MediaSummary[]>(MEDIA_QUERY, {}, []),
        freshFetch<OwnedAppearance[]>(
          OWNED_APPEARANCES_QUERY,
          { creatorIds: ownedCreatorIds },
          [],
        ),
      ]);
    // A small square thumb for the @ menu — helps tell near-identical names apart.
    const thumb = (image: Parameters<typeof urlFor>[0] | null | undefined) =>
      image ? urlFor(image).width(64).height(64).fit("crop").url() : null;
    mentionOptions = [
      ...allCreators.map((creator) => ({
        id: creator._id,
        label: creator.name ?? "Unknown",
        group: "creator" as const,
        thumb: thumb(creator.photo),
      })),
      ...allBooks.map((book) => ({
        id: book._id,
        label: book.title ?? "Untitled",
        group: "book" as const,
        thumb: thumb(book.cover),
      })),
      ...allConventions.map((convention) => ({
        id: convention._id,
        label: convention.name,
        group: "convention" as const,
        thumb: thumb(convention.image),
      })),
      ...allMedia.map((outlet) => ({
        id: outlet._id,
        label: outlet.name,
        group: "media" as const,
        thumb: thumb(outlet.logo),
      })),
    ];
    eventConventions = allConventions.map((convention) => ({
      id: convention._id,
      name: convention.name,
    }));
    ownedAppearances = appearances;
  }

  // Shared by the "Add an Event" button and each event card's Edit.
  const eventFormCreators = ownedCreators.map((creator) => ({
    id: creator._id,
    name: creator.name ?? "Your profile",
  }));
  const eventFormLabels = {
    addHeading: s.accountEventAddHeading,
    conventionLabel: s.accountEventConventionLabel,
    tableFieldLabel: s.accountEventTableLabel,
    noteFieldLabel: s.accountEventNoteLabel,
    saveLabel: s.accountEventSaveLabel,
    removeLabel: s.accountRemoveLabel,
    postingLabel: s.accountPostingLabel,
    postedLabel: s.accountEventPosted,
  };

  // Two tabbed dashboard columns — Updates|Feed and Cosigns|Saved Comics. The
  // panels are headingless; the tab label is the heading. Empty tabs are
  // dropped, empty columns aren't rendered.
  const tileGrid =
    "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3";

  const col1Tabs: PanelTab[] = [];
  if (isCreator) {
    col1Tabs.push({
      id: "updates",
      label: s.accountMyUpdatesHeading,
      content: (
        <div id="your-updates" className="scroll-mt-24">
          <UpdateFeed
            emptyLabel={s.accountMyUpdatesEmpty}
            updates={myUpdates}
            owner={updateOwnerConfig(s, mentionOptions)}
            scrollCap
          />
        </div>
      ),
    });
  }
  if (followIds.length > 0) {
    col1Tabs.push({
      id: "feed",
      label: s.accountFeedHeading,
      content: (
        <UpdateFeed emptyLabel={s.accountFeedEmpty} updates={updates} scrollCap />
      ),
    });
  }

  // Saved Comics leads (default tab), then Cosigns.
  const col2Tabs: PanelTab[] = [];
  if (savedBooks.length > 0) {
    col2Tabs.push({
      id: "saved-comics",
      label: s.accountSavedComicsHeading,
      content: (
        <ul className={tileGrid}>
          {savedBooks.map((book) => (
            <SavedItemRow
              key={book._id}
              layout="tile"
              itemId={book._id}
              itemType="book"
              title={book.title ?? "Untitled"}
              href={book.slug ? `/comics/${book.slug}` : null}
              removeLabel={s.accountRemoveLabel}
              removedLabel={s.accountRemovedLabel}
              undoLabel={s.accountUndoLabel}
              thumb={
                <div className="bg-muted relative aspect-[2/3] w-full overflow-hidden">
                  {book.cover && (
                    <Image
                      src={urlFor(book.cover).width(200).url()}
                      alt=""
                      fill
                      sizes="6rem"
                      className="object-cover"
                    />
                  )}
                </div>
              }
            />
          ))}
        </ul>
      ),
    });
  }
  if (cosigns.length > 0) {
    col2Tabs.push({
      id: "cosigns",
      label: s.accountCosignsHeading,
      content: (
        <ul className={tileGrid}>
          {cosigns.map((c) => (
            <li key={c._id}>
              <Link
                href={c.slug ? `/creators/${c.slug}` : "#"}
                className="group focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="bg-muted relative aspect-square w-full overflow-hidden">
                  {c.photo ? (
                    <Image
                      src={urlFor(c.photo).width(200).url()}
                      alt=""
                      fill
                      sizes="6rem"
                      className="object-cover"
                    />
                  ) : (
                    <InitialsAvatar name={c.name ?? ""} className="text-xl" />
                  )}
                </div>
                <p className="group-hover:text-primary mt-1 truncate text-xs">
                  {c.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ),
    });
  }

  return (
    <div>
      {/* Owner-only tab bar — the same Profile ↔ Dashboard flip that sits atop
          the public profile; here Dashboard is active. */}
      {isCreator && ownedCreators[0]?.slug && (
        <OwnerTabs
          active="dashboard"
          profileHref={`/creators/${ownedCreators[0].slug}`}
          profileLabel={s.profileTabLabel}
          dashboardLabel={s.dashboardTabLabel}
        />
      )}
      {/* The top user/creator zone keeps its own band (creator-pink / charcoal),
          so it's the one section that sits out the alternating rhythm below —
          AlternatingSections leaves any section with an explicit background
          alone. Everything after it alternates --background / --surface-alt (§9). */}
      <AlternatingSections>
        {/* Profile — a creator gets the personalization-teal zone holding their
            identity beside their comics; a plain reader gets the charcoal band
            with just their details. Teal is a black-text surface (§9). */}
        {/* A tight 24px band — the identity leads, no oversized md padding. */}
        <Section
          padding="none"
          background={isCreator ? "dashboard" : "charcoal"}
          className="px-6 py-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {/* A creator's identity band below is the visible header, so the
                  page h1 stays for a11y (§10) but is hidden for them; a plain
                  reader still sees it. */}
              <h1
                className={
                  isCreator
                    ? "sr-only"
                    : "text-2xl font-black tracking-tighter uppercase sm:text-4xl"
                }
              >
                {isCreator ? s.accountUserCreatorHeading : s.accountUserHeading}
              </h1>
              {/* Name + email only for a plain reader — a creator's identity is
                the profile block below, so these would just be noise. */}
              {!isCreator && (
                <>
                  {session.user?.name && (
                    <p className="text-foreground mt-2 font-bold">
                      {session.user.name}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">{email}</p>
                </>
              )}
            </div>
            {/* A creator's Sign Out moves into their card below (beneath the
                tenure line); a plain reader keeps it here. */}
            {!isCreator && (
              <SignOutButton
                label={settings.creatorIntake.signOutLabel}
                redirectTo="/"
              />
            )}
          </div>

          {isCreator && (
            // One row on desktop: the creator block sized to its content, Your
            // Comics filling the rest; they stack on phones.
            <div className="lg:flex lg:items-start lg:gap-8">
              <div className="lg:w-80 lg:shrink-0">
                <div className="space-y-4">
                  {ownedCreators.map((creator) => {
                    const sub =
                      creator.studio?.name ?? formatPlace(creator.place);
                    // Join month + year, for the "Rioting since" tenure line.
                    const joined = creator.joinedAt
                      ? new Date(creator.joinedAt).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      : null;
                    return (
                      <div key={creator._id} className="space-y-3">
                        <div className="flex gap-3 sm:gap-4">
                          {/* Avatar sized to the Your Comics covers beside it (105px). */}
                          <div className="relative aspect-square w-[105px] shrink-0 overflow-hidden bg-black/10">
                            {creator.photo ? (
                              <Image
                                src={urlFor(creator.photo).width(320).url()}
                                alt=""
                                fill
                                sizes="105px"
                                className="object-cover"
                              />
                            ) : (
                              <InitialsAvatar
                                name={creator.name ?? ""}
                                className="text-3xl"
                              />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <p className="truncate font-bold text-black">
                              {creator.name}
                            </p>
                            {sub && (
                              <p className="truncate text-sm text-black/70">
                                {sub}
                              </p>
                            )}
                            {joined && (
                              <p className="truncate text-xs text-black/60">
                                {s.accountRiotingSince.replace("{date}", joined)}
                              </p>
                            )}
                            {/* Sign Out sits at the bottom of the identity block. */}
                            <SignOutButton
                              label={settings.creatorIntake.signOutLabel}
                              redirectTo="/"
                              className="mt-auto self-start pt-2 text-black/70 hover:text-black"
                            />
                          </div>
                        </div>
                        {/* The card's actions — Post an Update / add an Event,
                            each filling half the width. */}
                        {composerTargets.length > 0 && (
                          <div className="flex gap-2">
                            <PostUpdateDialog
                              targets={composerTargets}
                              kinds={UPDATE_KINDS}
                              mentions={mentionOptions}
                              labels={composerLabelsFrom(s)}
                              trigger={
                                <Button
                                  variant="inverse"
                                  size="sm"
                                  className="flex-1 font-black tracking-wide uppercase"
                                >
                                  <Plus aria-hidden="true" className="size-4" />
                                  {s.accountAddUpdateLabel}
                                </Button>
                              }
                            />
                            <EventDialog
                              creators={eventFormCreators}
                              conventions={eventConventions}
                              labels={eventFormLabels}
                              trigger={
                                <Button
                                  variant="inverse"
                                  size="sm"
                                  className="flex-1 font-black tracking-wide uppercase"
                                >
                                  <Plus aria-hidden="true" className="size-4" />
                                  {s.accountAddEventLabel}
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comics ↔ Strips as tabs so neither rail overwhelms the other;
                  each tab carries its own add button beneath. */}
              <div className="mt-6 min-w-0 lg:mt-0 lg:flex-1">
                <TabbedPanel
                  tone="onColor"
                  tabs={[
                    {
                      id: "comics",
                      label: settings.sections.booksHeading,
                      content: (
                        <div>
                          <YourComics
                            books={yourComicsBooks}
                            strips={[]}
                            heading={s.accountComicsHeading}
                            editLabel={s.accountEditLabel}
                          />
                          <div className="mt-3">
                            <Button
                              asChild
                              variant="inverse"
                              size="sm"
                              className="font-black tracking-wide uppercase"
                            >
                              <Link href="/join/comics">
                                <Plus aria-hidden="true" className="size-4" />
                                {s.accountAddBookLabel}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ),
                    },
                    {
                      id: "strips",
                      label: settings.sections.stripsHeading,
                      content: (
                        <div>
                          <YourComics
                            books={[]}
                            strips={yourStrips}
                            heading={settings.sections.stripsHeading}
                            editLabel={s.accountEditLabel}
                          />
                          <div className="mt-3">
                            <StripComposer
                              copy={settings.stripIntake}
                              common={settings.creatorIntake}
                              reviewNotice={settings.reviewNotice}
                              creator={stripComposerCreator}
                              series={stripComposerSeries}
                            />
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </Section>

        {/* Your events + Collaboration requests, side by side (creators only).
            Events = convention appearances; Collab = incoming (respond with a
            canned preset) + sent (status). */}
        {isCreator && (
          <Section padding="md">
            <div className="grid gap-8 lg:grid-cols-2">
              <EventsManager
                current={ownedAppearances}
                labels={{
                  heading: s.accountEventsHeading,
                  empty: s.accountEventsEmpty,
                  tablePrefix: s.tableLabel,
                  tbaLabel: s.eventDateTba,
                  removeLabel: s.accountRemoveLabel,
                  editLabel: s.accountEventEditHeading,
                }}
                editForm={
                  composerTargets.length > 0
                    ? { creators: eventFormCreators, labels: eventFormLabels }
                    : undefined
                }
              />
              <CollabRequests
                incoming={incomingCollab}
                sent={sentCollab}
                copy={settings.collab}
              />
            </div>
          </Section>
        )}

        {/* Your Media — owners of an outlet (creator or not). Plain feed rows. */}
        {ownedMedia.length > 0 && (
          <Section padding="md">
            <SectionHeading as="h2" size="sm" tone="dashboard">
              {s.accountMediaHeading}
            </SectionHeading>
            <ul className={FEED_GRID}>
              {ownedMedia.map((outlet) => {
                const view = outlet.slug ? `/media/${outlet.slug}` : null;
                return (
                  <li
                    key={outlet._id}
                    className="border-border flex items-center gap-3 border-b py-3"
                  >
                    <div className="bg-background relative aspect-square w-9 shrink-0 overflow-hidden">
                      {outlet.logo && (
                        <Image
                          src={urlFor(outlet.logo).width(72).url()}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-contain"
                        />
                      )}
                    </div>
                    {view ? (
                      <Link
                        href={view}
                        className="hover:text-primary min-w-0 flex-1 truncate text-sm font-bold transition-colors"
                      >
                        {outlet.name}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {outlet.name}
                      </span>
                    )}
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/join/media?editing=${encodeURIComponent(outlet._id)}`}
                        >
                          {s.accountEditLabel}
                        </Link>
                      </Button>
                      {view && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={view}>{s.accountViewMediaLabel}</Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {/* Two tabbed columns: [Your Updates | Your Feed] and [Cosigns | Saved
            Comics]. Each column flips its panels in place. */}
        {(col1Tabs.length > 0 || col2Tabs.length > 0) && (
          <Section padding="md">
            <div className="grid gap-8 lg:grid-cols-2">
              {col1Tabs.length > 0 && <TabbedPanel tabs={col1Tabs} />}
              {col2Tabs.length > 0 && <TabbedPanel tabs={col2Tabs} />}
            </div>
          </Section>
        )}

        {!hasSaves && (
          // An empty shelf is a discovery moment, not a dead end (§3).
          <Section padding="md" maxWidth="3xl">
            <p className="text-muted-foreground text-sm">
              {settings.empty.saved}
            </p>
            <Link
              href="/comics"
              className="text-primary hover:text-primary focus-visible:ring-ring mt-4 inline-block text-sm font-black tracking-widest uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {settings.home.viewAllLabel} →
            </Link>
          </Section>
        )}

        {/* Monthly-email opt-in — explicit only (§3), and only for people who
            aren't already subscribed (MailerLite is the source of truth). */}
        {!newsletterSubscribed && (
          <Section padding="md">
            <NewsletterOptIn
              heading={s.accountNewsletterHeading}
              body={s.accountNewsletterBody}
              cta={s.accountNewsletterCta}
              successLabel={settings.newsletter.successMessage}
              errorLabel={settings.newsletter.errorMessage}
            />
          </Section>
        )}
      </AlternatingSections>
    </div>
  );
}

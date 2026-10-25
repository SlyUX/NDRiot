import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BunkerTabs, type BunkerTab } from "@/components/bunker-tabs";
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
import { SavedItemRow } from "@/components/saved-item-row";
import { SectionHeading } from "@/components/section-heading";
import { TabbedPanel, type PanelTab } from "@/components/tabbed-panel";
import { Plus, Handshake } from "lucide-react";
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
  OWNED_DOCS_QUERY,
  OWNED_MEDIA_QUERY,
  SAVED_BOOKS_QUERY,
  SAVED_CREATORS_QUERY,
  SAVED_STRIPS_QUERY,
  UPDATES_FEED_QUERY,
  APPEARANCE_FEED_QUERY,
  COLLAB_CREATORS_QUERY,
} from "@/lib/queries";
import { appearanceToFeedItem, mergeFeed } from "@/lib/feed-mappers";
import { getSiteSettings } from "@/lib/site-settings";
import { ownedDocIds } from "@/sanity/ownership-client";
import { mutualCosignIds } from "@/sanity/cosign-client";
import { incomingRequests, sentRequests } from "@/sanity/collab-client";
import { followerCount, savedItems } from "@/sanity/reader-client";
import { urlFor } from "@/sanity/image";
import type {
  BookSummary,
  ConventionSummary,
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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [settings, session, { view }] = await Promise.all([
    getSiteSettings(),
    auth(),
    searchParams,
  ]);
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

  // The dashboard renders one view at a time, so each fetch below is gated to the
  // view(s) that use it — switching sections only pays for that section's data
  // (this is what keeps view→view fast; the Bunker landing view pays the most).
  // `v` treats the default (bare /me, no ?view=) as the Bunker.
  const v = view ?? "bunker";

  // Cheap id lookups, in parallel (saves → the feed's follow ids + the saved
  // shelves; owned docs → isCreator and per-type lookups).
  const [saves, ownedIds] = await Promise.all([
    savedItems(email),
    ownedDocIds(email),
  ]);
  const bookIds = saves
    .filter((x) => x.itemType === "book")
    .map((x) => x.itemId);
  const creatorIds = saves
    .filter((x) => x.itemType === "creator")
    .map((x) => x.itemId);
  const stripIds = saves
    .filter((x) => x.itemType === "strip")
    .map((x) => x.itemId);

  // Owned docs resolve to their type first, so comics can be looked up by the
  // creator ids they belong to and media by their own ids.
  const ownedDocs = ownedIds.length
    ? await safeFetch<OwnedDoc[]>(OWNED_DOCS_QUERY, { ids: ownedIds }, [])
    : [];
  const ownedCreatorIds = ownedDocs
    .filter((d) => d._type === "creator")
    .map((d) => d._id);
  const ownedMediaIds = ownedDocs
    .filter((d) => d._type === "media")
    .map((d) => d._id);
  // Owning a creator doc is enough to know they're a creator — no extra fetch
  // (the full ownedCreators objects are pulled only for views that render them).
  const isCreator = ownedCreatorIds.length > 0;
  const myCreatorId = ownedCreatorIds[0];

  // The reader's update feed — everything they saved is a follow (§3). Newest
  // first, capped; recency only, never ranked.
  const followIds = [...bookIds, ...creatorIds];

  const [
    savedBooks,
    savedCreators,
    savedStrips,
    ownedCreators,
    ownedBooks,
    ownedMedia,
    feedPosts,
    feedAppearances,
    cosignIds,
    ownedSeries,
    collabIncoming,
    collabSent,
    myStripsRaw,
  ] = await Promise.all([
    // Saved view: the reader's saved comics + strips.
    v === "saved" && bookIds.length
      ? safeFetch<BookSummary[]>(SAVED_BOOKS_QUERY, { ids: bookIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    // Network view: creators the reader follows ("Followed Creators").
    v === "network" && creatorIds.length
      ? safeFetch<CreatorSummary[]>(SAVED_CREATORS_QUERY, { ids: creatorIds }, [])
      : Promise.resolve<CreatorSummary[]>([]),
    v === "saved" && stripIds.length
      ? safeFetch<StripSummary[]>(SAVED_STRIPS_QUERY, { ids: stripIds }, [])
      : Promise.resolve<StripSummary[]>([]),
    // The reader's own creator profiles — the Bunker header + Settings edit link.
    (v === "bunker" || v === "settings") && ownedCreatorIds.length
      ? safeFetch<CreatorSummary[]>(SAVED_CREATORS_QUERY, { ids: ownedCreatorIds }, [])
      : Promise.resolve<CreatorSummary[]>([]),
    // Bunker Comics tab: the creator's own comics.
    v === "bunker" && ownedCreatorIds.length
      ? safeFetch<BookSummary[]>(OWNED_BOOKS_QUERY, { ids: ownedCreatorIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    // Settings "Your Media".
    v === "settings" && ownedMediaIds.length
      ? safeFetch<MediaSummary[]>(OWNED_MEDIA_QUERY, { ids: ownedMediaIds }, [])
      : Promise.resolve<MediaSummary[]>([]),
    // Bunker Feed tab: followed creators' updates + their appearances.
    v === "bunker" && followIds.length
      ? safeFetch<UpdateFeedItem[]>(UPDATES_FEED_QUERY, { ids: followIds, limit: 30 }, [])
      : Promise.resolve<UpdateFeedItem[]>([]),
    v === "bunker" && followIds.length
      ? safeFetch<AppearanceFeedRow[]>(APPEARANCE_FEED_QUERY, { ids: followIds, limit: 30 }, [])
      : Promise.resolve<AppearanceFeedRow[]>([]),
    // Cosigns (mutual follows): the Bunker stat count + the Network cosign cards.
    (v === "bunker" || v === "network") && isCreator
      ? mutualCosignIds(myCreatorId)
      : Promise.resolve<string[]>([]),
    // Bunker Comics tab: the strip composer's series dropdown.
    v === "bunker" && ownedCreatorIds.length
      ? safeFetch<
          { _id: string; title: string | null; creatorId: string | null }[]
        >(INTAKE_OWNED_SERIES_QUERY, { ids: ownedCreatorIds }, [])
      : Promise.resolve<
          { _id: string; title: string | null; creatorId: string | null }[]
        >([]),
    // Network view: incoming + sent collaboration requests.
    v === "network" && isCreator
      ? incomingRequests(myCreatorId)
      : Promise.resolve([] as Awaited<ReturnType<typeof incomingRequests>>),
    v === "network" && isCreator
      ? sentRequests(myCreatorId)
      : Promise.resolve([] as Awaited<ReturnType<typeof sentRequests>>),
    // Bunker Comics tab: the creator's strips.
    v === "bunker" && ownedCreatorIds.length
      ? safeFetch<StripSummary[]>(CREATOR_STRIPS_QUERY, { id: myCreatorId }, [])
      : Promise.resolve<StripSummary[]>([]),
  ]);

  // Your Feed = followed creators' updates + their convention appearances,
  // merged newest-first (§3: recency only).
  const updates = mergeFeed(
    feedPosts,
    feedAppearances.map((a) => appearanceToFeedItem(a, s.conventionFeedBody)),
    30,
  );

  // Settings-only (external, blocking MailerLite call); Network-only cosign
  // cards; Bunker-only follower count (§3: self-knowledge, not a scoreboard).
  const newsletterSubscribed =
    v === "settings" ? await isSubscribedToNewsletter(email) : true;
  const cosigns =
    v === "network" && cosignIds.length
      ? await safeFetch<CreatorSummary[]>(SAVED_CREATORS_QUERY, { ids: cosignIds }, [])
      : [];
  const followers =
    v === "bunker" && isCreator ? await followerCount(ownedCreatorIds) : 0;

  // Collaboration requests — incoming (respond) + sent (status). Creator-only;
  // the private request docs resolve to public identities via COLLAB_CREATORS_QUERY.
  // Collaboration requests (Network view). The raw incoming/sent were fetched in
  // the batch above (empty off the Network view); resolve each other party's
  // public identity, then shape the view models.
  const collabOtherIds = [
    ...new Set([
      ...collabIncoming.map((r) => r.fromId),
      ...collabSent.map((r) => r.toId),
    ]),
  ];
  const collabOthers = collabOtherIds.length
    ? await safeFetch<
        { _id: string; name: string | null; slug: string | null }[]
      >(COLLAB_CREATORS_QUERY, { ids: collabOtherIds }, [])
    : [];
  const collabById = new Map(collabOthers.map((c) => [c._id, c]));
  const incomingCollab: IncomingCollab[] = collabIncoming.map((r) => ({
    fromId: r.fromId,
    name: collabById.get(r.fromId)?.name ?? "A creator",
    slug: collabById.get(r.fromId)?.slug ?? null,
    genre: r.genre,
    status: r.status,
    response: r.response,
  }));
  const sentCollab: SentCollab[] = collabSent.map((r) => ({
    name: collabById.get(r.toId)?.name ?? "A creator",
    slug: collabById.get(r.toId)?.slug ?? null,
    genre: r.genre,
    status: r.status,
    response: r.response,
  }));

  // Your Updates — the creator's own posts (updates targeting a creator or comic
  // they own), for the dashboard. Owner-editable, same as on the profile.
  const ownedTargetIds = [
    ...ownedCreatorIds,
    ...ownedBooks.map((book) => book._id),
  ];
  const myUpdates =
    v === "bunker" && ownedTargetIds.length
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
  const yourStrips: YourComicsStrip[] = myStripsRaw
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
          editTriggerLabel={`${s.accountEditLabel} — ${strip.title}`}
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
  if (composerTargets.length > 0 && v === "bunker") {
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

  // Column two — the reader's own saved work: Saved Comics leads (default tab),
  // then Saved Strips. Both are removable saves.
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
  if (savedStrips.length > 0) {
    col2Tabs.push({
      id: "saved-strips",
      label: s.accountSavedStripsHeading,
      content: (
        <ul className={tileGrid}>
          {savedStrips.map((strip) => (
            <SavedItemRow
              key={strip._id}
              layout="tile"
              itemId={strip._id}
              itemType="strip"
              title={strip.title ?? "Untitled"}
              href={strip.slug ? `/strips/${strip.slug}` : null}
              removeLabel={s.accountRemoveLabel}
              removedLabel={s.accountRemovedLabel}
              undoLabel={s.accountUndoLabel}
              thumb={
                <div className="bg-muted relative aspect-square w-full overflow-hidden">
                  {strip.image && (
                    <Image
                      src={urlFor(strip.image).width(200).height(200).url()}
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

  // Column three — the reader's relationships with creators: Cosigns (mutual
  // follows, derived — read-only tiles marked with the handshake) then Followed
  // Creators (their own follows, removable).
  const col3Tabs: PanelTab[] = [];
  if (cosigns.length > 0) {
    col3Tabs.push({
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
                  {/* Handshake badge — marks the mutual (cosigned) tie. Pink on a
                      black circle (5.69:1); rounded per request, the one round in
                      an otherwise square UI. */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-black"
                  >
                    <Handshake className="text-primary size-3" />
                  </span>
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
  if (savedCreators.length > 0) {
    col3Tabs.push({
      id: "followed-creators",
      label: s.accountFollowedCreatorsHeading,
      content: (
        <ul className={tileGrid}>
          {savedCreators.map((c) => (
            <SavedItemRow
              key={c._id}
              layout="tile"
              itemId={c._id}
              itemType="creator"
              title={c.name ?? "Creator"}
              href={c.slug ? `/creators/${c.slug}` : null}
              removeLabel={s.accountRemoveLabel}
              removedLabel={s.accountRemovedLabel}
              undoLabel={s.accountUndoLabel}
              thumb={
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
              }
            />
          ))}
        </ul>
      ),
    });
  }

  // ----------------------------------------------------------------- views
  // The user-nav island picks the view (?view=); /me renders one. Bunker is the
  // default — identity header + icon-top sub-tabs; the col2/col3 TabbedPanels are
  // reused for Saved and Network.

  // Bunker sub-tabs: Feed · Events · Comics · Activity · Profile. Feed shows for
  // everyone (updates from who you follow); the rest are creator surfaces, and
  // the +Update/+Event/+Comic/+Strip actions live inside their own tab now.
  const bunkerTabs: BunkerTab[] = [
    {
      id: "feed",
      label: s.bunkerTabFeed,
      content: (
        <UpdateFeed emptyLabel={s.accountFeedEmpty} updates={updates} scrollCap />
      ),
    },
  ];
  if (isCreator) {
    bunkerTabs.push(
      {
        id: "events",
        label: s.bunkerTabEvents,
        content: (
          <div className="space-y-5">
            {composerTargets.length > 0 && (
              <EventDialog
                creators={eventFormCreators}
                conventions={eventConventions}
                labels={eventFormLabels}
                triggerLabel={s.accountAddEventLabel}
                fullWidthTrigger
              />
            )}
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
          </div>
        ),
      },
      {
        id: "comics",
        label: s.bunkerTabComics,
        content: (
          <div className="space-y-8">
            <div className="space-y-3">
              <SectionHeading as="h3" size="sm">
                {settings.sections.booksHeading}
              </SectionHeading>
              <Button
                asChild
                variant="inverse"
                className="w-full font-black tracking-wide uppercase"
              >
                <Link href="/join/comics">
                  <Plus aria-hidden="true" className="size-4" />
                  {s.accountAddBookLabel}
                </Link>
              </Button>
              <YourComics
                books={yourComicsBooks}
                strips={[]}
                heading={s.accountComicsHeading}
                editLabel={s.accountEditLabel}
              />
            </div>
            <div className="space-y-3">
              <SectionHeading as="h3" size="sm">
                {settings.sections.stripsHeading}
              </SectionHeading>
              <StripComposer
                copy={settings.stripIntake}
                common={settings.creatorIntake}
                reviewNotice={settings.reviewNotice}
                creator={stripComposerCreator}
                series={stripComposerSeries}
              />
              <YourComics
                books={[]}
                strips={yourStrips}
                heading={settings.sections.stripsHeading}
                editLabel={s.accountEditLabel}
              />
            </div>
          </div>
        ),
      },
      {
        id: "activity",
        label: s.bunkerTabActivity,
        content: (
          <div className="space-y-5">
            {composerTargets.length > 0 && (
              <PostUpdateDialog
                targets={composerTargets}
                kinds={UPDATE_KINDS}
                mentions={mentionOptions}
                labels={composerLabelsFrom(s)}
                triggerLabel={s.accountAddUpdateLabel}
                fullWidthTrigger
              />
            )}
            <UpdateFeed
              emptyLabel={s.accountMyUpdatesEmpty}
              updates={myUpdates}
              owner={updateOwnerConfig(s, mentionOptions)}
              scrollCap
            />
          </div>
        ),
      },
      {
        id: "profile",
        label: s.bunkerTabProfile,
        content: (
          <div className="max-w-prose space-y-3">
            {ownedCreators[0]?.slug && (
              <Button
                asChild
                variant="inverse"
                className="font-black tracking-wide uppercase"
              >
                <Link href={`/creators/${ownedCreators[0].slug}`}>
                  {s.accountViewProfileLabel}
                </Link>
              </Button>
            )}
            {/* A full in-Bunker preview is a follow-up; editing lives in Settings. */}
            <p className="text-muted-foreground text-sm">
              {s.accountEditProfileLabel} → {s.dashboardTabSettings}.
            </p>
          </div>
        ),
      },
    );
  }

  const followsCount = followIds.length;
  const cosignsCount = cosignIds.length;

  const bunkerView = (
    <Section
      padding="md"
      maxWidth="3xl"
      innerClassName="mx-0 view-enter"
    >
      {/* The identity header is the creator's visible header, so the page h1
          stays for a11y (§10) but is hidden for them; a plain reader sees it. */}
      <h1
        className={
          isCreator
            ? "sr-only"
            : "text-2xl font-black tracking-tighter uppercase sm:text-4xl"
        }
      >
        {isCreator ? s.accountUserCreatorHeading : s.accountUserHeading}
      </h1>

      {!isCreator ? (
        <div>
          {session.user?.name && (
            <p className="text-foreground mt-2 font-bold">{session.user.name}</p>
          )}
          <p className="text-muted-foreground text-sm">{email}</p>
        </div>
      ) : (
        ownedCreators[0] && (
          <div>
            <div className="flex items-center gap-4">
              {/* Round avatar — the app layer's visual voice (§9). */}
              <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-full bg-white/10">
                {ownedCreators[0].photo ? (
                  <Image
                    src={urlFor(ownedCreators[0].photo).width(288).url()}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <InitialsAvatar
                    name={ownedCreators[0].name ?? ""}
                    className="text-3xl"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-2xl font-black tracking-tight">
                  {ownedCreators[0].name}
                </p>
                {(ownedCreators[0].studio?.name ??
                  formatPlace(ownedCreators[0].place)) && (
                  <p className="text-muted-foreground">
                    {ownedCreators[0].studio?.name ??
                      formatPlace(ownedCreators[0].place)}
                  </p>
                )}
              </div>
            </div>
            {/* Your own numbers — self-knowledge, never a scoreboard (§3).
                Followers is a count only (follows are stored hashed, so there's
                no who-follows-you list to open); follows + cosigns → Network. */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>
                <span className="text-foreground font-bold">
                  {followers.toLocaleString("en-US")}
                </span>{" "}
                <span className="text-muted-foreground">
                  {s.accountFollowersLabel}
                </span>
              </span>
              <Link
                href="/me?view=network"
                className="hover:text-primary underline underline-offset-2"
              >
                <span className="text-foreground font-bold">
                  {followsCount.toLocaleString("en-US")}
                </span>{" "}
                <span className="text-muted-foreground">
                  {s.accountFollowsLabel}
                </span>
              </Link>
              <Link
                href="/me?view=network"
                className="hover:text-primary underline underline-offset-2"
              >
                <span className="text-foreground font-bold">
                  {cosignsCount.toLocaleString("en-US")}
                </span>{" "}
                <span className="text-muted-foreground">
                  {s.accountCosignsLabel}
                </span>
              </Link>
            </div>
          </div>
        )
      )}

      <div className="mt-6">
        <BunkerTabs tabs={bunkerTabs} />
      </div>
    </Section>
  );

  const networkView = (
    <Section
      padding="md"
      maxWidth="3xl"
      innerClassName="mx-0 view-enter"
    >
      {col3Tabs.length > 0 && <TabbedPanel tabs={col3Tabs} />}
      {isCreator && (
        <div className={col3Tabs.length > 0 ? "mt-10" : ""}>
          <CollabRequests
            incoming={incomingCollab}
            sent={sentCollab}
            copy={settings.collab}
          />
        </div>
      )}
    </Section>
  );

  const savedView = (
    <Section
      padding="md"
      maxWidth="3xl"
      innerClassName="mx-0 view-enter"
    >
      {col2Tabs.length > 0 ? (
        <TabbedPanel tabs={col2Tabs} />
      ) : (
        // An empty shelf is a discovery moment, not a dead end (§3).
        <div className="max-w-prose">
          <p className="text-muted-foreground text-sm">{settings.empty.saved}</p>
          <Link
            href="/comics"
            className="text-primary hover:text-primary focus-visible:ring-ring mt-4 inline-block text-sm font-black tracking-widest uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {settings.home.viewAllLabel} →
          </Link>
        </div>
      )}
    </Section>
  );

  const settingsView = (
    <Section
      padding="md"
      maxWidth="3xl"
      innerClassName="mx-0 view-enter"
    >
      <div className="space-y-3">
        <SectionHeading as="h2" size="sm">
          {s.accountSettingsHeading}
        </SectionHeading>
        {session.user?.name && (
          <p className="text-foreground font-bold">{session.user.name}</p>
        )}
        <p className="text-muted-foreground text-sm">{email}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {isCreator && ownedCreators[0] && (
            <Button
              asChild
              variant="inverse"
              size="sm"
              className="font-black tracking-wide uppercase"
            >
              <Link
                href={`/join/creators?editing=${encodeURIComponent(ownedCreators[0]._id)}`}
              >
                {s.accountEditProfileLabel}
              </Link>
            </Button>
          )}
          <SignOutButton
            label={settings.creatorIntake.signOutLabel}
            redirectTo="/"
          />
        </div>
      </div>

      {/* Your Media — owners of an outlet manage it here. */}
      {ownedMedia.length > 0 && (
        <div className="mt-10">
          <SectionHeading as="h2" size="sm">
            {s.accountMediaHeading}
          </SectionHeading>
          <ul className={FEED_GRID}>
            {ownedMedia.map((outlet) => {
              const mediaHref = outlet.slug ? `/media/${outlet.slug}` : null;
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
                  {mediaHref ? (
                    <Link
                      href={mediaHref}
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
                    {mediaHref && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={mediaHref}>{s.accountViewMediaLabel}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Monthly-email opt-in — explicit only (§3), and only for people who
          aren't already subscribed (MailerLite is the source of truth). */}
      {!newsletterSubscribed && (
        <div className="mt-10">
          <NewsletterOptIn
            heading={s.accountNewsletterHeading}
            body={s.accountNewsletterBody}
            cta={s.accountNewsletterCta}
            successLabel={settings.newsletter.successMessage}
            errorLabel={settings.newsletter.errorMessage}
          />
        </div>
      )}
    </Section>
  );

  const viewContent =
    view === "network"
      ? networkView
      : view === "saved"
        ? savedView
        : view === "settings"
          ? settingsView
          : bunkerView;

  // Key by view so switching sections remounts the wrapper — React otherwise
  // updates the <Section> in place (same type/position), and a CSS enter
  // animation only plays on mount, so the transition wouldn't replay view→view.
  return <div key={view ?? "bunker"}>{viewContent}</div>;
}

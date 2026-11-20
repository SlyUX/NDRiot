import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BunkerCreateMenu } from "@/components/bunker-create-menu";
import { BunkerTabs, type BunkerTab } from "@/components/bunker-tabs";
import { SignInButton, SignOutButton } from "@/components/auth-controls";
import {
  CollabRequests,
  type IncomingCollab,
  type SentCollab,
} from "@/components/collab-requests";
import { CollabInfoTooltip } from "@/components/collab-info-tooltip";
import { type IncomingMessageRequest } from "@/components/message-requests";
import {
  MessageThreads,
  type Conversation,
  type AwaitingRow,
} from "@/components/message-threads";
import { NotificationPrefs } from "@/components/notification-prefs";
import { EventsManager } from "@/components/events-manager";
import { InitialsAvatar } from "@/components/initials-avatar";
import { NewsletterOptIn } from "@/components/newsletter-opt-in";
import { SavedItemRow } from "@/components/saved-item-row";
import { SectionHeading } from "@/components/section-heading";
import { TabbedPanel, type PanelTab } from "@/components/tabbed-panel";
import { Handshake, SlidersHorizontal } from "lucide-react";
import { StripComposer } from "@/components/strip-composer";
import {
  type ComposerTarget,
  type MentionOption,
} from "@/components/update-composer";
import { UpdateFeed } from "@/components/update-feed";
import {
  YourComics,
  type YourComicsBook,
  type YourComicsStrip,
} from "@/components/your-comics";
import { composerLabelsFrom, updateOwnerConfig } from "@/lib/composer-labels";
import { isSubscribedToNewsletter } from "@/lib/mailerlite";
import { formatPlace } from "@/lib/place";
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
  SAVED_BOOKS_QUERY,
  SAVED_CREATORS_QUERY,
  SAVED_STRIPS_QUERY,
  UPDATES_FEED_QUERY,
  APPEARANCE_FEED_QUERY,
  COLLAB_CREATORS_QUERY,
} from "@/lib/queries";
import { appearanceToFeedItem, mergeFeed } from "@/lib/feed-mappers";
import { getSiteSettings } from "@/lib/site-settings";
import { daysAgoISO } from "@/lib/utils";
import { ownedDocIds } from "@/sanity/ownership-client";
import { followSignal, mutualCosignIds } from "@/sanity/cosign-client";
import {
  mutedThreadIds,
  readStamps,
  threadsFor,
} from "@/sanity/message-client";
import { getReaderPrefs } from "@/sanity/reader-prefs-client";
import { incomingRequests, sentRequests } from "@/sanity/collab-client";
import { followerCount, savedItems } from "@/sanity/reader-client";
import { urlFor } from "@/sanity/image";
import { messageImageUrl } from "@/lib/messages";
import type {
  BookSummary,
  ConventionSummary,
  CreatorSummary,
  CollabCreator,
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
    feedPosts,
    feedAppearances,
    cosignIds,
    ownedSeries,
    collabIncoming,
    collabSent,
    myStripsRaw,
    messageThreadsRaw,
  ] = await Promise.all([
    // Saved view: the reader's saved comics + strips.
    v === "saved" && bookIds.length
      ? safeFetch<BookSummary[]>(SAVED_BOOKS_QUERY, { ids: bookIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    // Faves view: creators the reader follows ("Followed Creators").
    v === "saved" && creatorIds.length
      ? safeFetch<CreatorSummary[]>(
          SAVED_CREATORS_QUERY,
          { ids: creatorIds },
          [],
        )
      : Promise.resolve<CreatorSummary[]>([]),
    v === "saved" && stripIds.length
      ? safeFetch<StripSummary[]>(SAVED_STRIPS_QUERY, { ids: stripIds }, [])
      : Promise.resolve<StripSummary[]>([]),
    // The reader's own creator profiles — the Bunker header + Settings edit link.
    (v === "bunker" || v === "settings") && ownedCreatorIds.length
      ? safeFetch<CreatorSummary[]>(
          SAVED_CREATORS_QUERY,
          { ids: ownedCreatorIds },
          [],
        )
      : Promise.resolve<CreatorSummary[]>([]),
    // Bunker Comics tab: the creator's own comics.
    v === "bunker" && ownedCreatorIds.length
      ? safeFetch<BookSummary[]>(
          OWNED_BOOKS_QUERY,
          { ids: ownedCreatorIds },
          [],
        )
      : Promise.resolve<BookSummary[]>([]),
    // Bunker Feed tab: followed creators' updates + their appearances.
    v === "bunker" && followIds.length
      ? safeFetch<UpdateFeedItem[]>(
          UPDATES_FEED_QUERY,
          { ids: followIds, limit: 30 },
          [],
        )
      : Promise.resolve<UpdateFeedItem[]>([]),
    v === "bunker" && followIds.length
      ? safeFetch<AppearanceFeedRow[]>(
          APPEARANCE_FEED_QUERY,
          { ids: followIds, limit: 30 },
          [],
        )
      : Promise.resolve<AppearanceFeedRow[]>([]),
    // Cosigns (mutual follows): the Bunker stat count + the Faves cosign cards.
    (v === "bunker" || v === "saved") && isCreator
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
    // Network view: the creator's message threads (requests + conversations).
    v === "network" && isCreator
      ? threadsFor(myCreatorId)
      : Promise.resolve([] as Awaited<ReturnType<typeof threadsFor>>),
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
  const notifPrefs =
    v === "settings" && isCreator ? await getReaderPrefs(email ?? "") : null;
  const cosigns =
    v === "saved" && cosignIds.length
      ? await safeFetch<CreatorSummary[]>(
          SAVED_CREATORS_QUERY,
          { ids: cosignIds },
          [],
        )
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
    ? await safeFetch<CollabCreator[]>(
        COLLAB_CREATORS_QUERY,
        { ids: collabOtherIds },
        [],
      )
    : [];
  const collabById = new Map(collabOthers.map((c) => [c._id, c]));
  const incomingCollab: IncomingCollab[] = collabIncoming.map((r) => ({
    fromId: r.fromId,
    name: collabById.get(r.fromId)?.name ?? "A creator",
    slug: collabById.get(r.fromId)?.slug ?? null,
    genre: r.genre,
    status: r.status,
    response: r.response,
    createdAt: r.createdAt,
  }));
  const sentCollab: SentCollab[] = collabSent.map((r) => ({
    name: collabById.get(r.toId)?.name ?? "A creator",
    slug: collabById.get(r.toId)?.slug ?? null,
    genre: r.genre,
    status: r.status,
    response: r.response,
    createdAt: r.createdAt,
  }));

  // Messaging (Network view): resolve each other participant's public identity,
  // then split threads into incoming requests / sent-awaiting / active
  // conversations. The private follow signal is computed per incoming request.
  const otherOf = (t: (typeof messageThreadsRaw)[number]) =>
    (t.participantIds ?? []).find((id) => id !== myCreatorId) ?? "";
  const messageOtherIds = [
    ...new Set(messageThreadsRaw.map(otherOf).filter(Boolean)),
  ];
  const messageOthers = messageOtherIds.length
    ? await safeFetch<CollabCreator[]>(
        COLLAB_CREATORS_QUERY,
        { ids: messageOtherIds },
        [],
      )
    : [];
  const messageById = new Map(messageOthers.map((c) => [c._id, c]));
  const avatarOf = (id: string) => {
    const p = messageById.get(id)?.photo;
    return p ? urlFor(p).width(96).height(96).fit("crop").url() : null;
  };
  // General chats vs. accepted-collaboration chats — separate id lanes / tabs.
  const generalThreads = messageThreadsRaw.filter((t) => t.origin !== "collab");
  const collabThreadsRaw = messageThreadsRaw.filter(
    (t) => t.origin === "collab",
  );

  const incomingMessages: IncomingMessageRequest[] = await Promise.all(
    generalThreads
      .filter((t) => t.status === "pending" && t.initiatedById !== myCreatorId)
      .map(async (t) => {
        const otherId = otherOf(t);
        return {
          fromId: otherId,
          name: messageById.get(otherId)?.name ?? "A creator",
          slug: messageById.get(otherId)?.slug ?? null,
          avatarUrl: avatarOf(otherId),
          note: t.introNote ?? null,
          createdAt: t.createdAt ?? null,
          signal: await followSignal(otherId, myCreatorId, email ?? ""),
        };
      }),
  );

  const msgReads = messageThreadsRaw.length
    ? await readStamps(myCreatorId)
    : new Map<string, string>();
  const msgMuted = messageThreadsRaw.length
    ? await mutedThreadIds(myCreatorId)
    : new Set<string>();

  // Shared message mappers (general + collab threads use the same shape). The
  // preview falls back to a photo label when the last message is image-only.
  type RawThread = (typeof messageThreadsRaw)[number];
  const previewOf = (t: RawThread): string | null => {
    const last = (t.messages ?? []).at(-1);
    if (!last) return null;
    return last.body || (last.image ? settings.messaging.imageSentLabel : null);
  };
  const mapMessages = (t: RawThread) =>
    (t.messages ?? []).map((m) => ({
      key: m._key,
      fromId: m.fromId ?? "",
      body: m.body ?? "",
      imageUrl: messageImageUrl(m.image),
      createdAt: m.createdAt ?? null,
    }));

  const conversations: Conversation[] = generalThreads
    .filter((t) => t.status === "active")
    .map((t) => {
      const otherId = otherOf(t);
      return {
        threadDocId: t._id,
        otherName: messageById.get(otherId)?.name ?? "A creator",
        otherSlug: messageById.get(otherId)?.slug ?? null,
        otherAvatarUrl: avatarOf(otherId),
        preview: previewOf(t),
        contextLabel: null,
        messages: mapMessages(t),
        lastMessageAt: t.lastMessageAt ?? null,
        unread: Boolean(
          t.lastMessageAt && t.lastMessageAt > (msgReads.get(t._id) ?? ""),
        ),
        muted: msgMuted.has(t._id),
      };
    });

  const awaitingMessages: AwaitingRow[] = generalThreads
    .filter((t) => t.status === "pending" && t.initiatedById === myCreatorId)
    .map((t) => {
      const otherId = otherOf(t);
      return {
        name: messageById.get(otherId)?.name ?? "A creator",
        slug: messageById.get(otherId)?.slug ?? null,
        avatarUrl: avatarOf(otherId),
        createdAt: t.createdAt ?? null,
      };
    });

  // Accepted-collaboration chats (reuse the conversation UI), tagged with genre.
  const collabConversations: Conversation[] = collabThreadsRaw.map((t) => {
    const otherId = otherOf(t);
    return {
      threadDocId: t._id,
      otherName: messageById.get(otherId)?.name ?? "A creator",
      otherSlug: messageById.get(otherId)?.slug ?? null,
      otherAvatarUrl: avatarOf(otherId),
      preview: previewOf(t),
      contextLabel: t.collabGenre
        ? settings.messaging.collabChatLabel.replace("{genre}", t.collabGenre)
        : null,
      messages: mapMessages(t),
      lastMessageAt: t.lastMessageAt ?? null,
      unread: Boolean(
        t.lastMessageAt && t.lastMessageAt > (msgReads.get(t._id) ?? ""),
      ),
      muted: msgMuted.has(t._id),
    };
  });

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
            maturity: strip.maturityRating ?? "",
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

  // Headingless tabbed panels — the tab label is the heading. Empty tabs are
  // dropped, empty panels aren't rendered.
  const tileGrid =
    "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3";

  // Faves — the reader's follows + saves. Comics leads (default tab), then
  // saved Strips, then Creators (appended below). Saves removable; cosigns derived.
  const favesTabs: PanelTab[] = [];
  if (savedBooks.length > 0) {
    favesTabs.push({
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
    favesTabs.push({
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

  // Collab requests older than 7 days fold behind "view all" (server-computed).
  const collabRecentSince = daysAgoISO(7);
  // Network view (col3Tabs) — the creator's communication inbox: Conversations
  // (message threads + requests) then Collaborations (handshakes). Creator-only.
  // Follows + Cosigns live in Faves (favesTabs), unshifted in below.
  const col3Tabs: PanelTab[] = [];
  // Creator-only inbox tabs, first (Conversations is the default): message
  // threads + incoming requests, then the collaboration handshakes.
  if (isCreator) {
    col3Tabs.push({
      id: "conversations",
      label: settings.messaging.tabConversations,
      content: (
        <MessageThreads
          incoming={incomingMessages}
          conversations={conversations}
          awaiting={awaitingMessages}
          meId={myCreatorId}
          copy={settings.messaging}
        />
      ),
    });
    col3Tabs.push({
      id: "collaborations",
      label: settings.messaging.tabCollaborations,
      action: <CollabInfoTooltip text={settings.collab.incomingIntro} />,
      content: (
        <div className="space-y-8">
          {collabConversations.length > 0 && (
            <MessageThreads
              incoming={[]}
              conversations={collabConversations}
              awaiting={[]}
              meId={myCreatorId}
              copy={settings.messaging}
            />
          )}
          <CollabRequests
            incoming={incomingCollab}
            sent={sentCollab}
            copy={settings.collab}
            recentSince={collabRecentSince}
          />
        </div>
      ),
    });
  }
  // Faves "Creators" tab — appended last, after saved Comics/Strips, so Comics
  // stays the default (lead) tab: your Cosigns (mutual follows, derived,
  // read-only) then the creators you follow (removable).
  if (cosigns.length > 0 || savedCreators.length > 0) {
    favesTabs.push({
      id: "creators",
      label: s.accountFollowsTabLabel,
      content: (
        <div className="space-y-8">
          {cosigns.length > 0 && (
            <div>
              <SectionHeading as="h3" size="sm">
                {s.accountCosignsHeading}
              </SectionHeading>
              <ul className={`${tileGrid} mt-3`}>
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
                          <InitialsAvatar
                            name={c.name ?? ""}
                            className="text-xl"
                          />
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
            </div>
          )}
          {savedCreators.length > 0 && (
            <div>
              <SectionHeading as="h3" size="sm">
                {s.accountFollowedCreatorsHeading}
              </SectionHeading>
              <ul className={`${tileGrid} mt-3`}>
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
                          <InitialsAvatar
                            name={c.name ?? ""}
                            className="text-xl"
                          />
                        )}
                      </div>
                    }
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    });
  }

  // ----------------------------------------------------------------- views
  // The user-nav island picks the view (?view=); /me renders one. Bunker is the
  // default — identity header + icon-top sub-tabs; the col2/col3 TabbedPanels are
  // reused for Saved and Network.

  // Bunker sub-tabs: Feed · Activity · Comics. Feed shows for everyone (updates
  // from who you fave); Activity (your updates + events) and Comics (your comics
  // + strips) are creator surfaces. The public profile is reached from the
  // identity header — the former Profile sub-tab is gone.
  const bunkerTabs: BunkerTab[] = [
    {
      id: "feed",
      label: s.bunkerTabFeed,
      content: (
        <UpdateFeed
          emptyLabel={s.accountFeedEmpty}
          updates={updates}
          scrollCap
        />
      ),
    },
  ];
  if (isCreator) {
    bunkerTabs.push(
      {
        id: "activity",
        label: s.bunkerTabActivity,
        content: (
          <div className="space-y-10">
            {/* Your updates — posts about a profile or comic you own. */}
            <div className="space-y-5">
              <UpdateFeed
                emptyLabel={s.accountMyUpdatesEmpty}
                updates={myUpdates}
                owner={updateOwnerConfig(s, mentionOptions)}
                scrollCap
              />
            </div>
            {/* Your events — convention appearances. An event is a kind of update
                ("I'll be at X"), so it shares the Activity timeline. */}
            <div className="space-y-5">
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
    );
  }

  // The header "follows" stat counts followed CREATORS only — it links to Faves,
  // where follows now live. Saved comics (also follows for the feed, §3) sit
  // under Faves too, so they aren't double-counted here. followIds (books +
  // creators) still drives the Bunker feed; only this displayed stat narrows.
  const followsCount = creatorIds.length;
  const cosignsCount = cosignIds.length;

  // The identity header doubles as the link to the creator's public profile —
  // the former Bunker "Profile" sub-tab is gone, so the header is the way there.
  const creatorProfileHref = ownedCreators[0]?.slug
    ? `/creators/${ownedCreators[0].slug}`
    : null;
  const creatorIdentity = ownedCreators[0] ? (
    <>
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
        <p className="text-foreground group-hover:text-primary text-2xl font-black tracking-tight transition-colors">
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
    </>
  ) : null;

  const bunkerView = (
    <Section padding="md" maxWidth="3xl" innerClassName="view-enter">
      {/* Identity header on the left, Preferences gear on the right. The page h1
          stays for a11y (§10) but is hidden for creators, who see their own name
          header; a plain reader sees it. */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
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
                <p className="text-foreground mt-2 font-bold">
                  {session.user.name}
                </p>
              )}
              <p className="text-muted-foreground text-sm">{email}</p>
            </div>
          ) : (
            ownedCreators[0] && (
              <div>
                {creatorProfileHref ? (
                  <Link
                    href={creatorProfileHref}
                    className="group focus-visible:ring-ring inline-flex items-center gap-4 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {creatorIdentity}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4">
                    {creatorIdentity}
                  </div>
                )}
                {/* Your own numbers — self-knowledge, never a scoreboard (§3).
                Followers is a count only (follows are stored hashed, so there's
                no who-follows-you list to open); follows + cosigns → Network. */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {/* "faved by" reads before the count — "faved by 12" — unlike the
                  follows/cosigns stats, which read "12 faves" / "12 cosigns". */}
                  <span>
                    <span className="text-muted-foreground">
                      {s.accountFollowersLabel}
                    </span>{" "}
                    <span className="text-foreground font-bold">
                      {followers.toLocaleString("en-US")}
                    </span>
                  </span>
                  <Link
                    href="/me?view=saved"
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
                    href="/me?view=saved"
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
        </div>
        {/* Preferences gear — the account settings surface (sign-out, newsletter,
            and for creators notifications). Replaced the Settings nav tab; shown
            to every signed-in user. */}
        <Link
          href="/me?view=settings"
          aria-label={s.dashboardTabSettings}
          className="text-muted-foreground hover:text-primary focus-visible:ring-ring shrink-0 focus-visible:ring-2 focus-visible:outline-none"
        >
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </Link>
      </div>

      {/* One entry point for all creation — replaces the four add-buttons that
          used to live scattered across the sub-tabs. */}
      {composerTargets.length > 0 && (
        <div className="mt-6 flex justify-start">
          <BunkerCreateMenu
            createLabel={s.accountCreateLabel}
            itemLabels={{
              update: s.accountAddUpdateLabel,
              event: s.accountAddEventLabel,
              comic: s.accountAddBookLabel,
              strip: s.accountAddStripLabel,
            }}
            comicHref="/join/comics"
            update={{
              targets: composerTargets,
              kinds: UPDATE_KINDS,
              mentions: mentionOptions,
              labels: composerLabelsFrom(s),
            }}
            event={{
              creators: eventFormCreators,
              conventions: eventConventions,
              labels: eventFormLabels,
            }}
            strip={{
              copy: settings.stripIntake,
              common: settings.creatorIntake,
              reviewNotice: settings.reviewNotice,
              creator: stripComposerCreator,
              series: stripComposerSeries,
            }}
          />
        </div>
      )}
      <div className="mt-6">
        <BunkerTabs tabs={bunkerTabs} />
      </div>
    </Section>
  );

  const networkView = (
    <Section padding="md" maxWidth="3xl" innerClassName="view-enter">
      {col3Tabs.length > 0 && <TabbedPanel tabs={col3Tabs} />}
    </Section>
  );

  const favesView = (
    <Section padding="md" maxWidth="3xl" innerClassName="view-enter">
      {favesTabs.length > 0 ? (
        <TabbedPanel tabs={favesTabs} />
      ) : (
        // An empty shelf is a discovery moment, not a dead end (§3).
        <div className="max-w-prose">
          <p className="text-muted-foreground text-sm">
            {settings.empty.saved}
          </p>
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
    <Section padding="md" maxWidth="3xl" innerClassName="view-enter">
      <div className="space-y-3">
        <SectionHeading as="h2" size="sm">
          {s.accountSettingsHeading}
        </SectionHeading>
        {session.user?.name && (
          <p className="text-foreground font-bold">{session.user.name}</p>
        )}
        <p className="text-muted-foreground text-sm">{email}</p>
        {/* Edit Profile now lives on the creator's public profile (owner gear);
            this surface is account preferences only. */}
        <div className="flex flex-wrap gap-2 pt-1">
          <SignOutButton
            label={settings.creatorIntake.signOutLabel}
            redirectTo="/"
          />
        </div>
      </div>

      {isCreator && notifPrefs && (
        <div className="mt-10">
          <SectionHeading as="h2" size="sm">
            {settings.messaging.prefsHeading}
          </SectionHeading>
          <NotificationPrefs
            onLabel={settings.messaging.prefOnLabel}
            offLabel={settings.messaging.prefOffLabel}
            items={[
              {
                key: "emailMessages",
                label: settings.messaging.prefMessagesLabel,
                initial: notifPrefs.emailMessages,
              },
              {
                key: "emailCollab",
                label: settings.messaging.prefCollabLabel,
                initial: notifPrefs.emailCollab,
              },
            ]}
          />
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
        ? favesView
        : view === "settings"
          ? settingsView
          : bunkerView;

  // Key by view so switching sections remounts the wrapper — React otherwise
  // updates the <Section> in place (same type/position), and a CSS enter
  // animation only plays on mount, so the transition wouldn't replay view→view.
  // pb clears the fixed mobile user-nav island — the footer carries this on every
  // other page, but the footer is hidden here (app layer), so the page owns it.
  return (
    <div key={view ?? "bunker"} className="pb-28 md:pb-0">
      {viewContent}
    </div>
  );
}

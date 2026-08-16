import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AlternatingSections } from "@/components/alternating-sections";
import { SignInButton, SignOutButton } from "@/components/auth-controls";
import { EventDialog } from "@/components/event-dialog";
import { EventsManager } from "@/components/events-manager";
import { NewsletterOptIn } from "@/components/newsletter-opt-in";
import { SavedItemRow } from "@/components/saved-item-row";
import { SectionHeading } from "@/components/section-heading";
import {
  type ComposerTarget,
  type MentionOption,
} from "@/components/update-composer";
import { PostUpdateDialog } from "@/components/post-update-dialog";
import { UpdateFeed } from "@/components/update-feed";
import { YourComics, type YourComicsBook } from "@/components/your-comics";
import { composerLabelsFrom, updateOwnerConfig } from "@/lib/composer-labels";
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
  MEDIA_QUERY,
  OWNED_APPEARANCES_QUERY,
  OWNED_BOOKS_QUERY,
  OWNED_DOCS_QUERY,
  OWNED_MEDIA_QUERY,
  SAVED_BOOKS_QUERY,
  SAVED_CREATORS_QUERY,
  UPDATES_FEED_QUERY,
  APPEARANCE_FEED_QUERY,
} from "@/lib/queries";
import { appearanceToFeedItem, mergeFeed } from "@/lib/feed-mappers";
import { getSiteSettings } from "@/lib/site-settings";
import { ownedDocIds } from "@/sanity/ownership-client";
import { savedItems } from "@/sanity/reader-client";
import { urlFor } from "@/sanity/image";
import type {
  BookSummary,
  ConventionSummary,
  CreatorSummary,
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
    href: book.slug ? `/books/${book.slug}` : null,
    editHref: `/join/books?editing=${encodeURIComponent(book._id)}`,
    coverUrl: book.cover ? urlFor(book.cover).width(300).url() : null,
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

  return (
    <div>
      {/* The top user/creator zone keeps its own band (creator-pink / charcoal),
          so it's the one section that sits out the alternating rhythm below —
          AlternatingSections leaves any section with an explicit background
          alone. Everything after it alternates --background / --surface-alt (§9). */}
      <AlternatingSections>
        {/* Profile — a creator gets the personalization-teal zone holding their
            identity beside their comics; a plain reader gets the charcoal band
            with just their details. Teal is a black-text surface (§9). */}
        <Section padding="md" background={isCreator ? "personalize" : "charcoal"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase sm:text-4xl">
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
            <SignOutButton
              label={settings.creatorIntake.signOutLabel}
              redirectTo="/"
              className={
                isCreator ? "text-black/70 hover:text-black" : undefined
              }
            />
          </div>

          {isCreator && (
            // One row on desktop: the creator block sized to its content, Your
            // Comics filling the rest; they stack on phones.
            <div className="mt-6 lg:flex lg:items-start lg:gap-8">
              <div className="lg:w-80 lg:shrink-0">
                <div className="space-y-4">
                  {ownedCreators.map((creator) => {
                    const sub =
                      creator.studio?.name ?? formatPlace(creator.place);
                    return (
                      <div key={creator._id} className="flex gap-3 sm:gap-4">
                        <div className="relative aspect-square w-14 shrink-0 overflow-hidden bg-black/10 sm:w-20">
                          {creator.photo && (
                            <Image
                              src={urlFor(creator.photo).width(160).url()}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 56px, 80px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-black">
                            {creator.name}
                          </p>
                          {sub && (
                            <p className="truncate text-sm text-black/70">
                              {sub}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {/* Edit lives in the profile's owner band + the edit
                                form; hidden on phones to declutter the block. */}
                            <Button
                              asChild
                              variant="inverse"
                              size="sm"
                              className="max-sm:hidden"
                            >
                              <Link
                                href={`/join/creators?editing=${encodeURIComponent(creator._id)}`}
                              >
                                {s.accountEditLabel}
                              </Link>
                            </Button>
                            {creator.slug && (
                              <Button asChild variant="inverse" size="sm">
                                <Link href={`/creators/${creator.slug}`}>
                                  {s.accountViewCreatorLabel}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Post an Update + Add an Event — modals, their triggers stacked
                    to fill the creator column. */}
                {composerTargets.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <PostUpdateDialog
                      targets={composerTargets}
                      kinds={UPDATE_KINDS}
                      mentions={mentionOptions}
                      labels={composerLabelsFrom(s)}
                    />
                    <EventDialog
                      creators={ownedCreators.map((creator) => ({
                        id: creator._id,
                        name: creator.name ?? "Your profile",
                      }))}
                      conventions={eventConventions}
                      labels={{
                        addHeading: s.accountEventAddHeading,
                        conventionLabel: s.accountEventConventionLabel,
                        tableFieldLabel: s.accountEventTableLabel,
                        noteFieldLabel: s.accountEventNoteLabel,
                        saveLabel: s.accountEventSaveLabel,
                      }}
                    />
                  </div>
                )}
              </div>

              {yourComicsBooks.length > 0 && (
                <div className="mt-6 min-w-0 lg:mt-0 lg:flex-1">
                  <YourComics
                    books={yourComicsBooks}
                    heading={s.accountComicsHeading}
                    editLabel={s.accountEditLabel}
                  />
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Your events — the creator's convention appearances (attending/tabling). */}
        {isCreator && (
          <Section padding="md">
            <EventsManager
              current={ownedAppearances}
              labels={{
                heading: s.accountEventsHeading,
                empty: s.accountEventsEmpty,
                tablePrefix: s.tableLabel,
                removeLabel: s.accountRemoveLabel,
              }}
            />
          </Section>
        )}

        {/* Your Media — owners of an outlet (creator or not). Plain feed rows. */}
        {ownedMedia.length > 0 && (
          <Section padding="md">
            <SectionHeading as="h2" size="sm">
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

        {/* Your Feed (who you follow) + Your Updates (your own posts). */}
        {(followIds.length > 0 || isCreator) && (
          <Section padding="md">
            <div className="grid gap-8 lg:grid-cols-2">
              {followIds.length > 0 && (
                <UpdateFeed
                  heading={s.accountFeedHeading}
                  emptyLabel={s.accountFeedEmpty}
                  updates={updates}
                  scrollCap
                />
              )}
              {isCreator && (
                // Anchor target for the "manage your updates" link on a creator's
                // own profile; scroll-mt clears the fixed nav on the jump.
                <div id="your-updates" className="scroll-mt-24">
                  <UpdateFeed
                    heading={s.accountMyUpdatesHeading}
                    emptyLabel={s.accountMyUpdatesEmpty}
                    updates={myUpdates}
                    owner={updateOwnerConfig(s, mentionOptions)}
                    scrollCap
                  />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Favorite Creators + Your Saved Comics, side by side. */}
        {(savedCreators.length > 0 || savedBooks.length > 0) && (
          <Section padding="md">
            <div className="grid gap-8 lg:grid-cols-2">
              {savedCreators.length > 0 && (
                <div>
                  <SectionHeading as="h2" size="sm">
                    {s.accountSavedCreatorsHeading}
                  </SectionHeading>
                  {/* A wrapping grid of square portraits, name beneath — mirrors
                      Your Saved Comics, but a face needs its name to be legible. */}
                  <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3">
                    {savedCreators.map((creator) => (
                      <SavedItemRow
                        key={creator._id}
                        layout="tile"
                        tileAspect="square"
                        caption
                        itemId={creator._id}
                        itemType="creator"
                        title={creator.name ?? "Comic Creator"}
                        href={creator.slug ? `/creators/${creator.slug}` : null}
                        removeLabel={s.accountRemoveLabel}
                        removedLabel={s.accountRemovedLabel}
                        undoLabel={s.accountUndoLabel}
                        thumb={
                          <div className="bg-muted relative aspect-square w-full overflow-hidden">
                            {creator.photo && (
                              <Image
                                src={urlFor(creator.photo).width(200).url()}
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
                </div>
              )}
              {savedBooks.length > 0 && (
                <div>
                  <SectionHeading as="h2" size="sm">
                    {s.accountSavedComicsHeading}
                  </SectionHeading>
                  {/* A wrapping grid of covers — each links to the book, Remove in
                    the corner. */}
                  <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3">
                    {savedBooks.map((book) => (
                      <SavedItemRow
                        key={book._id}
                        layout="tile"
                        itemId={book._id}
                        itemType="book"
                        title={book.title ?? "Untitled"}
                        href={book.slug ? `/books/${book.slug}` : null}
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
                </div>
              )}
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
              href="/books"
              className="text-primary hover:text-primary focus-visible:ring-ring mt-4 inline-block text-sm font-black tracking-widest uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {settings.home.viewAllLabel} →
            </Link>
          </Section>
        )}

        {/* Monthly-email opt-in — every signed-in reader, explicit only (§3). */}
        <Section padding="md">
          <NewsletterOptIn
            heading={s.accountNewsletterHeading}
            body={s.accountNewsletterBody}
            cta={s.accountNewsletterCta}
            successLabel={settings.newsletter.successMessage}
            errorLabel={settings.newsletter.errorMessage}
          />
        </Section>
      </AlternatingSections>
    </div>
  );
}

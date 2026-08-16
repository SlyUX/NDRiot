import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AlternatingSections } from "@/components/alternating-sections";
import { ContentCardGrid } from "@/components/content-card-grid";
import { CreatorEvents } from "@/components/creator-events";
import { FeedPreview } from "@/components/feed-preview";
import { JsonLd } from "@/components/json-ld";
import { OrganizationLink } from "@/components/organization-link";
import PortableTextBody from "@/components/PortableTextBody";
import { SaveButton } from "@/components/save-button";
import SocialLinks from "@/components/SocialLinks";
import { SocialIcon } from "@/components/social-icon";
import { SectionHeading } from "@/components/section-heading";
import { UpdateFeed } from "@/components/update-feed";
import { ShareBar } from "@/components/share-bar";
import { GenreBadge } from "@/components/genre-badge";
import { Badge } from "@/components/ui/badge";
import { externalHref } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { bookToCard, favoriteToCard } from "@/lib/card-mappers";
import { formatPlace } from "@/lib/place";
import { isUpcomingDate } from "@/lib/conventions";
import { pageMetadata } from "@/lib/page-metadata";
import { auth } from "@/auth";
import { isSaved } from "@/sanity/reader-client";
import { ownsCreator } from "@/sanity/ownership-client";
import { fetchFeed } from "@/lib/feed-parse";
import {
  safeFetch,
  CREATOR_QUERY,
  CREATOR_UPDATES_QUERY,
  CREATOR_APPEARANCES_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import {
  breadcrumbSchema,
  comicMakerSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import type {
  CreatorAppearance,
  CreatorDetail,
  UpdateFeedItem,
} from "@/lib/types";
import { urlFor } from "@/sanity/image";

export const dynamic = "force-dynamic";

/**
 * Render the owner-band copy with the phrase "public profile" bolded, so the
 * owner reads it as "this is the reader-facing page, not my dashboard." The copy
 * stays CMS-editable (§2); if an editor rewrites it without that phrase, it just
 * renders plain.
 */
function ownerBanner(text: string) {
  const term = "public profile";
  const i = text.toLowerCase().indexOf(term);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-bold text-white">
        {text.slice(i, i + term.length)}
      </strong>
      {text.slice(i + term.length)}
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [creator, settings] = await Promise.all([
    safeFetch<CreatorDetail | null>(CREATOR_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!creator) return {};
  return pageMetadata({
    title: creator.name ?? "Comic Creator",
    description: creator.bioText,
    path: `/creators/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [creator, settings, session] = await Promise.all([
    safeFetch<CreatorDetail | null>(CREATOR_QUERY, { slug }, null),
    getSiteSettings(),
    auth(),
  ]);

  // Real 404 rather than a 200 that says "not found" — search engines and
  // monitoring both read the status code, not the copy.
  if (!creator) notFound();

  const email = session?.user?.email;
  // Saved state + whether the viewer owns this profile (for the owner band).
  // The page is already dynamic + authed, so this is free.
  const [saved, isOwner] = email
    ? await Promise.all([
        isSaved(email, creator._id),
        ownsCreator(email, creator._id),
      ])
    : [false, false];

  // Favorites are shown as horizontal creator cards. All on-site in practice;
  // any without a profile or link are dropped.
  const favoriteCards = (creator.favoriteCreators ?? [])
    .map(favoriteToCard)
    .filter((card): card is NonNullable<typeof card> => card !== null);

  // Possessive, personal headings on this page — favorites and works — take the
  // creator's first name via the {name} placeholder in their CMS copy.
  const firstName = (creator.name ?? "").split(" ")[0] || (creator.name ?? "");
  const booksHeading = settings.sections.creatorBooksHeading.replace(
    "{name}",
    firstName,
  );
  const favoritesHeading = settings.sections.creatorFavoritesHeading.replace(
    "{name}",
    firstName,
  );
  const feedHeading = settings.sections.feedHeading.replace(
    "{name}",
    firstName,
  );
  const updatesHeading = settings.sections.creatorUpdatesHeading.replace(
    "{name}",
    firstName,
  );

  // Their ND Riot updates — posts targeting this creator or one of their comics.
  // Read-only here, for everyone including the owner: posting and editing live on
  // the dashboard's "Your Updates" (one home for that), which the owner reaches
  // via the anchor link beside this feed.
  const creatorUpdates = await safeFetch<UpdateFeedItem[]>(
    CREATOR_UPDATES_QUERY,
    { creatorId: creator._id, limit: 20 },
    [],
  );

  // Their convention appearances (own docs) — for the Events row, upcoming only.
  const appearances = await safeFetch<CreatorAppearance[]>(
    CREATOR_APPEARANCES_QUERY,
    { creatorId: creator._id },
    [],
  );

  // Their own feed (blog, webcomic updates), if they gave one and it's live.
  // Cached for half an hour; a dead or moved feed returns null and shows nothing.
  const feed = creator.feedUrl
    ? await fetchFeed(creator.feedUrl, { revalidate: 1800 })
    : null;

  // The left column (photo, socials + website, genre/format chips). If empty, it
  // collapses so the info column fills the row. Owner shortcuts live in the band
  // above, not here, so ownership no longer forces the column open.
  // Any upcoming convention appearance → show the Events row (auto-expires past).
  const hasEvents = appearances.some(
    (appearance) => appearance.venue && isUpcomingDate(appearance.forDate),
  );

  const hasSidebar = Boolean(
    creator.photo ||
    creator.socials?.length ||
    creator.website ||
    creator.genres?.length ||
    creator.formats?.length ||
    creator.audience,
  );

  return (
    <div>
      <JsonLd
        data={jsonLdGraph(
          comicMakerSchema({
            name: creator.name ?? "Comic Creator",
            url: absoluteUrl(`/creators/${slug}`),
            photo: creator.photo,
            bio: creator.bioText,
            socials: creator.socials,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Comic Creators", path: "/creators" },
            {
              name: creator.name ?? "Comic Creator",
              path: `/creators/${slug}`,
            },
          ]),
        )}
      />

      {/* Owner band — only when you're viewing your own profile. A thin notice
          plus the owner's two shortcuts, inline: the dashboard (manage
          everything) and the edit form. Links are white (pink is only 3.34:1 on
          charcoal — fails AA, §9); no inline editing on the public page itself. */}
      {isOwner && (
        <div className="bg-charcoal">
          <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-1 px-6 py-1.5 text-sm text-white/80">
            <span>{ownerBanner(settings.sections.profileOwnerBanner)}</span>
            <span className="flex items-center gap-2">
              <Link
                href="/me"
                className="focus-visible:ring-ring text-white underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {settings.sections.profileOwnerDashboardLabel}
              </Link>
              <span aria-hidden="true" className="text-white/30">
                |
              </span>
              <Link
                href={`/join/creators?editing=${encodeURIComponent(creator._id)}`}
                className="focus-visible:ring-ring text-white underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {settings.sections.profileOwnerEditLabel}
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* Everything below the owner band shares the alternating rhythm (§9). */}
      <AlternatingSections>
        {/* pb-4, not the full md bottom padding: the bio sits close beneath. */}
        <Section as="header" padding="md" className="pb-4">
          {/* The identity block and the creator's updates split the row 50/50 from
            tablet up (stretch, so the updates column can match this one's
            height); they stack on phones. */}
          <div className="md:flex md:gap-8">
            <div className="md:w-1/2 md:min-w-0">
              {/* items-start so the portrait's top aligns with the creator name,
                rather than its bottom aligning with the last line of info. */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {hasSidebar && (
                  // Left-aligned on every size (no mobile centering), sized to the
                  // portrait so the contacts and chips stack neatly beneath it.
                  <div className="flex shrink-0 flex-col items-start gap-3 sm:w-40">
                    {creator.photo && (
                      <div className="relative h-40 w-40 overflow-hidden">
                        <Image
                          src={urlFor(creator.photo)
                            .width(320)
                            .height(320)
                            .url()}
                          alt={
                            creator.photo.alt ?? `Portrait of ${creator.name}`
                          }
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    {/* Socials + the website, as icons. */}
                    {(creator.socials?.length || creator.website) && (
                      <div className="-ml-2.5 flex flex-wrap items-center gap-1">
                        <SocialLinks socials={creator.socials} />
                        {creator.website && (
                          <a
                            href={externalHref(creator.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Website"
                            title="Website"
                            className="text-muted-foreground hover:text-primary focus-visible:ring-ring flex size-10 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <SocialIcon platform="Website" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Genres link out to their category page; formats and audience
                      have no page, so they stay unlinked. */}
                    {(creator.genres?.length ||
                      creator.formats?.length ||
                      creator.audience) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {creator.genres?.map((genre) => (
                          <GenreBadge key={genre} genre={genre} size="md" />
                        ))}
                        {creator.formats?.map((format) => (
                          <Badge
                            key={format}
                            variant="outline"
                            className="text-muted-foreground px-2.5 py-0.5 text-[10px] tracking-wider uppercase"
                          >
                            {format}
                          </Badge>
                        ))}
                        {creator.audience && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground px-2.5 py-0.5 text-[10px] tracking-wider uppercase"
                          >
                            {creator.audience}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase">
                    {creator.name}
                  </h1>
                  {creator.studio && (
                    <div className="mt-1">
                      {/* Studio shown as text, not its logo: sitting directly beneath
                    the portrait, a logo competes with the photo above it. */}
                      <OrganizationLink
                        organization={creator.studio}
                        size="md"
                        display="text"
                      />
                    </div>
                  )}
                  {formatPlace(creator.place, creator.location) && (
                    <p className="text-muted-foreground">
                      {formatPlace(creator.place, creator.location)}
                    </p>
                  )}

                  {/* Deliberately: "here's where to find me"
                then "and I'm open to collaborate" reads as one thought, so the
                reader connects the invitation to the means of reaching out — no
                icon needed. Only for an explicit yes: `false` and "never
                answered" both mean no badge, since claiming availability nobody
                offered is worse than staying quiet. */}
                  {creator.openToCollaboration && (
                    <div className="mt-3">
                      <Badge
                        variant="outline"
                        className="border-primary/60 text-primary px-2.5 py-0.5 text-[10px] tracking-widest uppercase"
                      >
                        {settings.sections.openToCollaborationLabel}
                      </Badge>
                    </div>
                  )}

                  {creator.bio && (
                    <div className="mt-5">
                      <PortableTextBody value={creator.bio} />
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {/* No Follow on your own profile — you can't follow yourself.
                        For everyone else it's "Follow", not "Save": truer for a
                        person, and the same underlying saved signal (§3). */}
                    {!isOwner && (
                      <SaveButton
                        itemType="creator"
                        itemId={creator._id}
                        initialSaved={saved}
                        signedIn={Boolean(email)}
                        saveLabel={settings.sections.followLabel}
                        savedLabel={settings.sections.followingLabel}
                        signInCopy={{
                          title: settings.sections.accountSignInTitle,
                          body: settings.sections.accountSignInBody,
                          cta: settings.sections.accountSignInCta,
                        }}
                      />
                    )}
                    <ShareBar
                      title={creator.name ?? ""}
                      url={absoluteUrl(`/creators/${slug}`)}
                      label={settings.sections.shareLabel}
                      copiedLabel={settings.sections.linkCopiedLabel}
                    />
                  </div>
                </div>
              </div>
            </div>
            {creatorUpdates.length > 0 && (
              <div className="relative mt-8 md:mt-0 md:w-1/2 md:min-w-0">
                {/* Absolute on md+ so this column doesn't drive the row height —
                  the info block does, and the feed scrolls to match it (same
                  pink scrollbar as My Feed on home). */}
                <div className="punk-scroll md:absolute md:inset-0 md:overflow-y-auto md:pr-2">
                  <UpdateFeed
                    heading={updatesHeading}
                    emptyLabel=""
                    updates={creatorUpdates}
                    // Read-only for everyone; the owner gets a link to manage them
                    // on the dashboard, where posting + editing live.
                    action={
                      isOwner ? (
                        <Link
                          href="/me#your-updates"
                          className="text-primary focus-visible:ring-ring text-xs font-bold tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {settings.sections.profileManageUpdatesLabel}
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {!!creator.books?.length && (
          <ContentCardGrid
            heading={booksHeading}
            headingSize="sm"
            cards={creator.books.map(bookToCard)}
            columns={5}
            padding="md"
            emptyMessage={settings.empty.books}
          />
        )}

        {hasEvents && (
          <Section padding="md">
            <CreatorEvents
              appearances={appearances}
              heading={settings.sections.creatorEventsHeading}
              tableLabel={settings.sections.tableLabel}
            />
          </Section>
        )}

        {feed && (
          <Section padding="md">
            <FeedPreview heading={feedHeading} entries={feed.entries} />
          </Section>
        )}

        {!!creator.organizations?.length && (
          <Section padding="md">
            <SectionHeading size="sm">
              {settings.sections.creatorOrganizationsHeading}
            </SectionHeading>
            <ul className="flex flex-wrap items-center gap-4">
              {creator.organizations.map((org) => (
                <li key={org._id}>
                  <OrganizationLink organization={org} display="badge" />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {favoriteCards.length > 0 && (
          <ContentCardGrid
            heading={favoritesHeading}
            headingSize="sm"
            cards={favoriteCards}
            layout="horizontal"
            columns={4}
            summaryLines={4}
            padding="md"
            emptyMessage=""
          />
        )}
      </AlternatingSections>
    </div>
  );
}

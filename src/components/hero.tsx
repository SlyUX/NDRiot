import Image from "next/image";
import Link from "next/link";

import { TaxonomyRow } from "@/components/content-card";
import { SpinnerRack } from "@/components/spinner-rack";
import PortableTextBody from "@/components/PortableTextBody";
import { Button } from "@/components/ui/button";
import { MentionedText } from "@/components/mentioned-text";
import type { HeroFeatureItem } from "@/lib/hero-queue";
import type { HeroSettings } from "@/lib/site-settings";
import type { HomeNewItem, RailFeedItem } from "@/lib/types";
import { cn, truncate } from "@/lib/utils";
import { urlFor } from "@/sanity/image";

/**
 * Homepage hero — a split, not a carousel.
 *
 * Left: one random book, given the spotlight. It is the §3 discovery hero — a
 * guaranteed route to work nobody went looking for — so it stays random, never
 * curated. Right: the newest books and creators to join the directory, ordered
 * by arrival (which surfaces new entrants, not established ones). Above both,
 * the site's identity line and its calls to action.
 *
 * All server-rendered; nothing about the random draw ships to the browser.
 */

export interface HeroProps {
  hero: HeroSettings;
  /** The spotlight queue — a preloaded run of uniform-random picks the client
   *  advances through instantly on "Spin the Rack" (SpinnerRack). [0] is shown
   *  first and is server-rendered; empty hides the spotlight. */
  heroItems: HeroFeatureItem[];
  /** Save labels + sign-in copy for the featured comic (SpinnerRack renders the
   *  button per pick). */
  heroSave: {
    signedIn: boolean;
    saveLabel: string;
    savedLabel: string;
    signInCopy: { title: string; body: string; cta: string };
  };
  /** Newest books and creators — the rail's fallback when there are no updates. */
  newItems: HomeNewItem[];
  /** The updates rail: My Feed (with follows) or the global Latest Updates. When
   *  non-empty it takes the rail; otherwise `newItems` does. */
  feedItems: RailFeedItem[];
  /** Rail heading for the feed — reflects which feed is shown (§2 copy). */
  feedHeading: string;
  /** Label for the "Spin the Rack" button — CMS copy (AGENTS.md §2). */
  discoverLabel?: string;
  /** When signed in: greets the reader and shows their own CTAs in place of the
   *  evangelism tagline/subhead/buttons. */
  account?: { greeting: string; ctas: Cta[] };
}

/** A hero call-to-action (label + path). */
type Cta = { label: string; href: string };

/**
 * Shipped artwork, used when Sanity has no hero background. The Sanity field
 * still wins — this just keeps the hero from being a bare black box on first
 * load, the way an empty singleton would otherwise render.
 */
const BACKGROUND_FALLBACK = "/nd-riot-hero-bkgrd.jpg";

/**
 * One rail row — a new book or creator as a compact text entry (no thumbnail).
 * Title, an arrival line ("a new comic by …" / "a new comic creator"), a short
 * blurb, and up to three genres — the same shape for either type.
 */
function NewRow({ item }: { item: HomeNewItem }) {
  const isBook = item._type === "book";
  const href = isBook ? `/comics/${item.slug}` : `/creators/${item.slug}`;
  const title = isBook ? item.title : item.name;
  const line = isBook
    ? item.creatorName
      ? `a new comic by ${item.creatorName}`
      : "a new comic"
    : "a new comic creator";
  const blurb = truncate(isBook ? item.descriptionText : item.bioText, 90);

  return (
    <li>
      <Link
        href={href}
        className="group focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none"
      >
        <p className="group-hover:text-primary line-clamp-2 text-sm leading-snug font-bold text-white transition-colors">
          {title}
        </p>
        {/* White + italic: lifts the arrival line off the near-black rail and
            gives it a clear rung below the title. */}
        <p className="mt-0.5 text-xs text-white italic">{line}</p>
        {blurb && (
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            {blurb}
          </p>
        )}
        {item.genres?.length ? (
          <TaxonomyRow genres={item.genres.slice(0, 3)} className="mt-1.5" />
        ) : null}
      </Link>
    </li>
  );
}

/**
 * One update in the rail. A followed creator's update glows — a hot-pink left
 * border and the creator's avatar — so it stands out from the global recency
 * around it, without being reordered (§3: emphasis, not ranking).
 */
function FeedRow({ item }: { item: RailFeedItem }) {
  const href = item.targetSlug
    ? item.targetType === "book"
      ? `/comics/${item.targetSlug}`
      : `/creators/${item.targetSlug}`
    : null;
  return (
    // A followed update is boxed in a personalization-teal border with the
    // creator's avatar, so it stands out where it falls in the recency order.
    <li
      className={cn(
        "flex gap-2.5",
        item.followed && "border-personalize border p-2.5",
      )}
    >
      {item.followed && (
        <div className="bg-muted relative size-7 shrink-0 overflow-hidden">
          {item.photo && (
            <Image
              src={urlFor(item.photo).width(56).url()}
              alt={item.authorName ?? ""}
              fill
              sizes="28px"
              className="object-cover"
            />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-primary text-[10px] font-black tracking-widest uppercase">
          {item.kind}
        </p>
        {href ? (
          <Link
            href={href}
            className="group focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="group-hover:text-primary block truncate text-xs font-bold text-white transition-colors">
              {item.targetName}
            </span>
          </Link>
        ) : (
          <span className="block truncate text-xs font-bold text-white">
            {item.targetName}
          </span>
        )}
        {/* @-mentions linked inline within the body (MentionedText). */}
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/85">
          <MentionedText
            body={item.body}
            mentions={item.mentions}
            linkClassName="text-primary font-bold hover:underline"
          />
        </p>
      </div>
    </li>
  );
}

/**
 * The updates section of the rail — updates from creators the reader follows, a
 * scrollable recency list. A thin personalization-teal bar accents the heading
 * (this is the reader's own feed); each followed update is boxed with its avatar.
 */
function FeedRail({
  heading,
  items,
}: {
  heading: string;
  items: RailFeedItem[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-personalize text-xs leading-tight font-black tracking-[0.2em] uppercase">
          {heading}
        </h2>
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
      </div>
      <ul className="space-y-4">
        {items.map((item) => (
          <FeedRow key={item._id} item={item} />
        ))}
      </ul>
    </div>
  );
}

/**
 * The new-arrivals section of the rail — newest books and creators, by arrival.
 * Always present, so the rail stays populated while updates are sparse; it sits
 * beneath the followed-updates section when there is one.
 */
function NewArrivals({
  heading,
  items,
}: {
  heading: string;
  items: HomeNewItem[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-primary text-xs leading-tight font-black tracking-[0.2em] uppercase">
          {heading}
        </h2>
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
      </div>
      {/* On phones the rail stacks below the feature, so cap it to three rows. */}
      <ul className="space-y-4 max-sm:[&>li:nth-child(n+4)]:hidden">
        {items.map((item) => (
          <NewRow key={item._id} item={item} />
        ))}
      </ul>
    </div>
  );
}

export function Hero({
  hero,
  heroItems,
  heroSave,
  newItems,
  feedItems,
  feedHeading,
  discoverLabel,
  account,
}: HeroProps) {
  const hasFeature = heroItems.length > 0;
  const ctas = account?.ctas ?? hero.ctas;
  return (
    // Hand-rolled rather than <Section> so the background layers can span the
    // full bleed while the content stays at the site width.
    <section
      data-slot="section"
      className="relative isolate overflow-hidden px-6 pt-12 pb-10"
    >
      <Image
        src={
          hero.background
            ? urlFor(hero.background).width(2400).url()
            : BACKGROUND_FALLBACK
        }
        alt=""
        fill
        sizes="100vw"
        priority
        className="-z-20 object-cover"
      />
      {/* A flat wash for a legibility floor, plus edge-darkening so text sits on
          the quietest part of the collage. */}
      <div className="absolute inset-0 -z-10 bg-black/75" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      <div className="mx-auto w-full max-w-[90rem]">
        {/* Identity strip — the site's line and its calls to action, stacked so
            the buttons left-align under the heading. Signed in, the reader's own
            greeting + CTAs replace the outward evangelism. */}
        <div className="flex flex-col gap-5">
          <div className="space-y-3">
            <h1 className="text-3xl leading-none font-black tracking-tight text-white uppercase sm:text-4xl lg:text-5xl">
              {account ? account.greeting : hero.tagline}
            </h1>
            {/* Subhead — supporting copy under the H1 (blank when signed in). The
                editor writes hero.body; until then this fallback carries the head
                terms (graphic novels, webcomics) the H1 keeps out of its punch. */}
            {account ? null : hero.body?.length ? (
              <div className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                <PortableTextBody value={hero.body} />
              </div>
            ) : (
              <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                Graphic novels, single issues, and webcomics from real indie
                creators — across every genre.
              </p>
            )}
          </div>
          {ctas.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {ctas.map((cta, i) => (
                <Button
                  key={cta.href}
                  asChild
                  size="lg"
                  // First is the pink primary, second the white inverse.
                  variant={i === 0 ? "default" : "inverse"}
                  className="font-black tracking-wide uppercase"
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* The split: featured book left, updates rail right (new arrivals when
            there are no updates yet). */}
        {(hasFeature || feedItems.length > 0 || newItems.length > 0) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start lg:gap-8">
            {hasFeature && (
              // Instant "Spin the Rack": a client-advanced queue of uniform-random
              // picks (fairness in src/lib/hero-queue.ts). Its pick is client
              // state, so a row shuffle re-rendering this never disturbs the hero.
              <SpinnerRack
                items={heroItems}
                featuredHeading={hero.featuredHeading}
                discoverLabel={discoverLabel ?? "Spin the rack"}
                ctaLabel={hero.featureCtaLabel}
                save={heroSave}
              />
            )}

            {/* Rail: a reader's followed updates (when any) stacked over the
                new-arrivals list, which is always there to keep it populated. On
                desktop the two scroll as one capped unit (a persistent pink
                scrollbar) so the hero doesn't dominate the fold; on phones it
                just flows, to avoid trapping touch-scroll. */}
            {(feedItems.length > 0 || newItems.length > 0) && (
              <div
                className={cn(
                  "punk-scroll space-y-8 lg:max-h-[500px] lg:overflow-y-scroll lg:pr-2",
                  !hasFeature && "lg:col-span-full",
                )}
              >
                {feedItems.length > 0 && (
                  <FeedRail heading={feedHeading} items={feedItems} />
                )}
                {/* New arrivals — hidden on phones to keep the mobile hero short. */}
                {newItems.length > 0 && (
                  <div className="max-md:hidden">
                    <NewArrivals heading={hero.newHeading} items={newItems} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

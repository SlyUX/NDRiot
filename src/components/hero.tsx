import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shuffle } from "lucide-react";

import { TaxonomyRow } from "@/components/content-card";
import PortableTextBody from "@/components/PortableTextBody";
import { Button } from "@/components/ui/button";
import { MentionedText } from "@/components/mentioned-text";
import type { HeroSettings } from "@/lib/site-settings";
import type { HeroBook, HomeNewItem, RailFeedItem } from "@/lib/types";
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
  /** One random book, chosen per request — the spotlight. */
  feature: HeroBook | null;
  /** Newest books and creators — the rail's fallback when there are no updates. */
  newItems: HomeNewItem[];
  /** The updates rail: My Feed (with follows) or the global Latest Updates. When
   *  non-empty it takes the rail; otherwise `newItems` does. */
  feedItems: RailFeedItem[];
  /** Rail heading for the feed — reflects which feed is shown (§2 copy). */
  feedHeading: string;
  /** URL that re-rolls the feature to a different random book. Omit to hide. */
  discoverHref?: string;
  /** Label for that button — CMS copy (AGENTS.md §2). */
  discoverLabel?: string;
  /** Save control for the featured comic — a client component passed as a slot
   *  so the server hero doesn't import it. Rendered over the cover. */
  saveSlot?: ReactNode;
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
 * The featured book — the full cover flush left, filling the panel's height at
 * its native 2:3 (nothing cropped), with the title and blurb beside it. The
 * whole panel links to the book. Stays a two-column row down to phones.
 */
function FeatureBook({
  book,
  ctaLabel,
  saveSlot,
}: {
  book: HeroBook;
  ctaLabel: string;
  saveSlot?: ReactNode;
}) {
  const preview =
    truncate(book.descriptionText, 280) ?? truncate(book.shortDescription, 280);
  const href = `/comics/${book.slug}`;

  // Not one big <Link> anymore: Save is a <button> and lives in the text column,
  // which can't sit inside an anchor. So the cover, title, and CTA each link to
  // the book instead; `group` keeps the whole-panel hover affordance.
  return (
    <div className="group border-border flex h-full min-h-[13rem] flex-row overflow-hidden border bg-black/40 sm:min-h-[26rem]">
      {/* The cover fills the panel height at its native 2:3 (nothing cropped). */}
      <Link
        href={href}
        aria-label={book.title}
        className="focus-visible:ring-ring bg-muted relative aspect-[2/3] h-full w-auto shrink-0 overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
      >
        {book.cover ? (
          <Image
            src={urlFor(book.cover).width(800).url()}
            alt={book.cover.alt ?? ""}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full" aria-hidden="true" />
        )}
        {book.fundingUrl && (
          <span className="bg-funding absolute top-2 left-2 z-10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
            Now Funding
          </span>
        )}
      </Link>

      {/* pr-12 on mobile keeps the top lines clear of the Discover button in
          the panel's corner; roomy uniform padding from sm up. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-4 pr-12 sm:p-8">
        {book.creatorName && (
          <p className="text-primary truncate text-xs font-bold tracking-widest uppercase">
            {book.creatorName}
          </p>
        )}
        <Link
          href={href}
          className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
        >
          <h2 className="text-base leading-tight font-black tracking-tight text-white uppercase group-hover:underline sm:text-2xl lg:text-3xl">
            {book.title}
          </h2>
        </Link>
        {/* Save — in the text flow directly under the title. self-start so it
            keeps its natural width instead of stretching the column. */}
        {saveSlot && <div className="self-start">{saveSlot}</div>}
        {/* Only the top genre on phones, where the column is tight; the full row
            from sm up. */}
        <TaxonomyRow
          genres={book.genres}
          format={book.format}
          className="max-sm:[&>*:nth-child(n+2)]:hidden"
        />
        {/* The blurb is room-permitting: hidden in the tight phone column, back
            from sm up. Cover + title + CTA carry the phone layout. */}
        {preview && (
          <p className="hidden text-sm leading-relaxed text-white/85 sm:line-clamp-4 sm:block sm:text-base">
            {preview}
          </p>
        )}
        {/* Primary CTA — "read it" is the point of the hero, so it's the pink
            button; Save (over the cover) is the outline secondary beside it. */}
        <Button
          asChild
          size="sm"
          className="mt-1 self-start font-black tracking-widest uppercase"
        >
          <Link href={href}>
            {ctaLabel}
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        </Button>
      </div>
    </div>
  );
}

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
  feature,
  newItems,
  feedItems,
  feedHeading,
  discoverHref,
  discoverLabel,
  saveSlot,
  account,
}: HeroProps) {
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
        {(feature || feedItems.length > 0 || newItems.length > 0) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start lg:gap-8">
            {feature && (
              <div className="flex h-full flex-col">
                {/* Heading row: the section name left, the Spin control right —
                    "spin the rack" reads as the action that re-rolls the pick. */}
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
                    {hero.featuredHeading}
                  </h2>
                  <span
                    className="h-px flex-1 bg-white/20"
                    aria-hidden="true"
                  />
                  {discoverHref && (
                    <Link
                      href={discoverHref}
                      scroll={false}
                      aria-label={discoverLabel ?? "Spin the rack"}
                      className="focus-visible:ring-ring border-border text-foreground hover:border-primary hover:text-primary inline-flex shrink-0 items-center gap-1.5 border px-3 py-1 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {discoverLabel ?? "Spin the rack"}
                      <Shuffle
                        aria-hidden="true"
                        strokeWidth={2.5}
                        className="size-3.5"
                      />
                    </Link>
                  )}
                </div>

                <div className="flex-1">
                  <FeatureBook
                    book={feature}
                    ctaLabel={hero.featureCtaLabel}
                    saveSlot={saveSlot}
                  />
                </div>
              </div>
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
                  !feature && "lg:col-span-full",
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

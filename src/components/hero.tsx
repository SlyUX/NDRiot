import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Book, Shuffle, User } from 'lucide-react'

import { TaxonomyRow } from '@/components/content-card'
import PortableTextBody from '@/components/PortableTextBody'
import { Button } from '@/components/ui/button'
import type { HeroSettings } from '@/lib/site-settings'
import type { HeroBook, HomeNewItem } from '@/lib/types'
import { cn, truncate } from '@/lib/utils'
import { urlFor } from '@/sanity/image'

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
  hero: HeroSettings
  /** One random book, chosen per request — the spotlight. */
  feature: HeroBook | null
  /** Newest books and creators, for the rail. */
  newItems: HomeNewItem[]
  /** URL that re-rolls the feature to a different random book. Omit to hide. */
  discoverHref?: string
  /** Label for that button — CMS copy (AGENTS.md §2). */
  discoverLabel?: string
}

/**
 * Shipped artwork, used when Sanity has no hero background. The Sanity field
 * still wins — this just keeps the hero from being a bare black box on first
 * load, the way an empty singleton would otherwise render.
 */
const BACKGROUND_FALLBACK = '/nd-riot-hero-bkgrd.jpg'

/**
 * The featured book — the full cover flush left, filling the panel's height at
 * its native 2:3 (nothing cropped), with the title and blurb beside it. The
 * whole panel links to the book. Stays a two-column row down to phones.
 */
function FeatureBook({ book, ctaLabel }: { book: HeroBook; ctaLabel: string }) {
  const preview = truncate(book.descriptionText, 280) ?? truncate(book.shortDescription, 280)

  return (
    <Link
      href={`/books/${book.slug}`}
      className="group focus-visible:ring-ring border-border flex h-full min-h-[13rem] flex-row overflow-hidden border bg-black/40 focus-visible:ring-2 focus-visible:outline-none sm:min-h-[26rem]"
    >
      {/* The cover fills the panel height and the aspect derives its width, at
          the cover's native 2:3 so nothing is cropped — a two-column row at
          every width. */}
      <div className="bg-muted relative aspect-[2/3] h-full w-auto shrink-0 overflow-hidden">
        {book.cover ? (
          <Image
            src={urlFor(book.cover).width(800).url()}
            alt={book.cover.alt ?? ''}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full" aria-hidden="true" />
        )}
        {book.fundingUrl && (
          // A plain badge, not the linking FundingBadge: the panel already links
          // to the book, and an anchor cannot nest inside another.
          <span className="bg-funding absolute top-2 left-2 z-10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
            Currently Funding
          </span>
        )}
      </div>

      {/* pr-12 on mobile keeps the top lines clear of the Discover button in
          the panel's corner; roomy uniform padding from sm up. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-4 pr-12 sm:p-8">
        {book.creatorName && (
          <p className="text-primary truncate text-xs font-bold tracking-widest uppercase">
            {book.creatorName}
          </p>
        )}
        <h2 className="text-base leading-tight font-black tracking-tight text-white uppercase group-hover:underline sm:text-2xl lg:text-3xl">
          {book.title}
        </h2>
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
        <span className="text-primary mt-1 inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase">
          {ctaLabel}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
          />
        </span>
      </div>
    </Link>
  )
}

/** One rail row — a new book or creator, typed by its icon. */
function NewRow({ item }: { item: HomeNewItem }) {
  const isBook = item._type === 'book'
  const href = isBook ? `/books/${item.slug}` : `/creators/${item.slug}`
  const title = isBook ? item.title : item.name
  const subtitle = isBook ? item.creatorName : (item.studioName ?? item.location)
  const image = isBook ? item.cover : item.photo
  const Icon = isBook ? Book : User
  const typeLabel = isBook ? 'Comic' : 'Comic Maker'
  // A comic maker's portrait needs describing; a cover sits beside its own title.
  const alt = isBook ? '' : `Portrait of ${item.name ?? 'comic maker'}`

  return (
    <li>
      <Link
        href={href}
        className="group focus-visible:ring-ring flex items-center gap-3 focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
            <Icon aria-hidden="true" className="size-3" />
            {typeLabel}
          </p>
          <p className="group-hover:text-primary mt-1 line-clamp-2 text-sm leading-snug font-bold text-white transition-colors">
            {title}
          </p>
          {subtitle && <p className="text-muted-foreground mt-0.5 truncate text-xs">{subtitle}</p>}
        </div>
        <div className="bg-muted relative aspect-[4/3] w-20 shrink-0 overflow-hidden sm:w-24">
          {image && (
            <Image
              src={urlFor(image).width(240).url()}
              alt={alt}
              fill
              sizes="96px"
              className="object-cover"
            />
          )}
        </div>
      </Link>
    </li>
  )
}

export function Hero({ hero, feature, newItems, discoverHref, discoverLabel }: HeroProps) {
  return (
    // Hand-rolled rather than <Section> so the background layers can span the
    // full bleed while the content stays at the site width.
    <section data-slot="section" className="relative isolate overflow-hidden px-6 pt-12 pb-10">
      <Image
        src={hero.background ? urlFor(hero.background).width(2400).url() : BACKGROUND_FALLBACK}
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
        {/* Identity strip — the site's line and its calls to action. Outward
            evangelism, so it leads the page. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl leading-none font-black tracking-tight text-white uppercase sm:text-4xl lg:text-5xl">
              {hero.tagline}
            </h1>
            {/* Subhead — supporting copy under the H1. The editor writes
                hero.body; until then this fallback carries the head terms
                (graphic novels, webcomics) that the H1 keeps out of its punch. */}
            {hero.body?.length ? (
              <div className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                <PortableTextBody value={hero.body} />
              </div>
            ) : (
              <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                Graphic novels, single issues, and webcomics from real indie creators — across
                every genre.
              </p>
            )}
          </div>
          {hero.ctas.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {hero.ctas.map((cta, i) => (
                <Button
                  key={cta.href}
                  asChild
                  size="lg"
                  // First is the pink primary, second the white inverse.
                  variant={i === 0 ? 'default' : 'inverse'}
                  className="font-black tracking-wide uppercase"
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* The split: featured book left, new-arrivals rail right. */}
        {(feature || newItems.length > 0) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
            {feature && (
              <div className="flex h-full flex-col">
                {/* "Featured" — named and set apart from the tagline above,
                    mirroring the rail's heading opposite it. */}
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
                    {hero.featuredHeading}
                  </h2>
                  <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
                </div>

                {/* The Discover button is a sibling of the feature's link, not
                    nested inside it (anchors cannot nest), over the panel's
                    top-right. */}
                <div className="relative flex-1">
                  <FeatureBook book={feature} ctaLabel={hero.featureCtaLabel} />
                  {discoverHref && (
                    <Link
                      href={discoverHref}
                      scroll={false}
                      aria-label={discoverLabel ?? 'Discover'}
                      className="focus-visible:ring-ring border-border bg-background/70 text-foreground hover:bg-background absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 border p-2 text-xs font-bold tracking-widest uppercase backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-3 sm:py-1.5"
                    >
                      {/* Icon-only in the tight phone column; labelled from sm up. */}
                      <span className="hidden sm:inline">{discoverLabel ?? 'Discover'}</span>
                      <Shuffle aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {newItems.length > 0 && (
              <div className={cn(!feature && 'lg:col-span-full')}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
                  <h2 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
                    {hero.newHeading}
                  </h2>
                </div>
                {/* On phones the rail stacks below the feature, so cap it to
                    three rows there — enough for a taste without pushing the
                    content rows a screen down. Full list from sm up, where it
                    sits beside the feature and balances its height. */}
                <ul className="space-y-4 max-sm:[&>li:nth-child(n+4)]:hidden">
                  {newItems.map((item) => (
                    <NewRow key={item._id} item={item} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

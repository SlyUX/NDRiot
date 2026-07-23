import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from '@portabletext/react'

import { MaturityOverlay, TaxonomyRow } from '@/components/content-card'
import { HeroCarousel, type HeroSlide } from '@/components/hero-carousel'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { bookToCard } from '@/lib/card-mappers'
import type { HeroSettings } from '@/lib/site-settings'
import type { HeroBook } from '@/lib/types'
import { cn, truncate } from '@/lib/utils'
import { urlFor } from '@/sanity/image'

/**
 * Homepage hero: one persistent background, several foreground slides.
 *
 * Server Component. It builds the slides and hands them to HeroCarousel,
 * which is the only client code involved — so the cards keep rendering on the
 * server and nothing about books ships to the browser as logic.
 *
 * Slide 1 is the pitch (logo, headline, body, CTAs) from siteSettings.
 * Slides 2-4 are the Homepage feature references, as horizontal cards.
 */

export interface HeroProps {
  hero: HeroSettings
  /** Chosen at random per request — see the homepage. */
  books: HeroBook[]
}

/**
 * Shipped artwork, used when Sanity has no hero background.
 *
 * The Sanity field still wins — this is a default in the same sense as the
 * copy defaults in site-settings.ts, not a second source of truth. It exists
 * so the hero is never a bare black box, which is what an empty singleton
 * would otherwise produce on first load.
 */
const BACKGROUND_FALLBACK = '/nd-riot-hero-bkgrd.jpg'

/**
 * How long each slide holds.
 *
 * Not one shared interval, because the slides are not comparable. The pitch
 * runs to roughly a hundred words — about 25-30 seconds at normal reading
 * speed — so a five-second turn fades it out mid-argument, around the end of
 * the second sentence. A featured book is a title, a byline and a line of
 * summary, and stalling on it just makes the carousel feel stuck.
 *
 * 12s does not let anyone finish the pitch. It is a deliberate compromise:
 * long enough that the argument lands and the reader chooses to stay, short
 * enough that the featured work still surfaces on its own.
 */
const PITCH_DURATION_MS = 12_000
const FEATURE_DURATION_MS = 6_000

/**
 * A book, at hero scale.
 *
 * Mirrors the pitch slide's two-column shape — art left, words right — so the
 * carousel reads as one composition rather than a pitch followed by some
 * cards. A ContentCard would have been the reuse-first choice, but its
 * horizontal layout is a list row: 96px thumbnail, clamped summary, no call
 * to action. Dropped into a 30rem hero it looked stranded, which is what the
 * previous version did. This composes the same pieces at a different scale
 * instead (AGENTS.md §4, option 3).
 */
function FeatureSlide({ book, ctaLabel }: { book: HeroBook; ctaLabel: string }) {
  const card = bookToCard(book)
  // The full description, flattened and cut to a hero-sized preview — the "…"
  // signals the rest is on the book page. Falls back to the short description
  // for a book that has one but no full write-up.
  const preview = truncate(book.descriptionText, 200) ?? truncate(book.shortDescription, 200)

  return (
    // `auto` on the first column, not a half share: the cover is 16rem, so an
    // even split left ~440px of dead space between it and the text. Sizing
    // the column to its content pulls the words back against the artwork.
    // The trade is empty space on the right, which reads as deliberate
    // margin rather than a gap in the middle of the composition.
    <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
      <div className="flex justify-start">
        <div
          className={cn('relative w-48 shrink-0 overflow-hidden sm:w-56 lg:w-64 aspect-[2/3]')}
        >
          {card.image ? (
            <Image
              src={urlFor(card.image).width(600).url()}
              alt={card.image.alt ?? card.imageAlt}
              fill
              sizes="(max-width: 1024px) 14rem, 16rem"
              className="object-cover"
            />
          ) : (
            <div className="bg-muted h-full w-full" aria-hidden="true" />
          )}
          {card.maturity && <MaturityOverlay maturity={card.maturity} />}
        </div>
      </div>

      <div className="max-w-xl">
        {card.eyebrow && (
          <p className="text-primary text-xs tracking-widest uppercase">{card.eyebrow}</p>
        )}

        {/* h2, not h1 — the page's h1 lives on the pitch slide. */}
        <h2 className="mt-2 text-2xl leading-tight font-black tracking-tight text-white uppercase sm:text-3xl">
          {card.title}
        </h2>

        <TaxonomyRow genres={card.genres} format={card.format} className="mt-3" />

        {preview && (
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">{preview}</p>
        )}

        <div className="mt-6">
          <Button asChild size="lg" className="font-black tracking-wide uppercase">
            <Link href={card.href}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Hero({ hero, books }: HeroProps) {
  const featured = books.filter(Boolean).slice(0, 3)

  const pitchSlide = (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="flex justify-start">
        {/* alt="" because the headline beside it already names the site — a
            screen reader would otherwise hear "ND Riot" twice. */}
        <Logo size="hero" alt="" priority />
      </div>

      <div className="max-w-xl">
        <h1 className="text-3xl leading-none font-black tracking-tight text-white uppercase sm:text-4xl">
          {hero.headline}
        </h1>

        {hero.body && (
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/85 sm:text-base [&_strong]:font-bold [&_strong]:text-white">
            <PortableText value={hero.body} />
          </div>
        )}

        {hero.ctas.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-3">
            {hero.ctas.map((cta, i) => (
              <Button
                key={cta.href}
                asChild
                size="lg"
                // First is the pink primary, second the white inverse —
                // matching the design's paper-and-ink pairing.
                variant={i === 0 ? 'default' : 'inverse'}
                className="font-black tracking-wide uppercase"
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const slides: HeroSlide[] = [
    {
      content: pitchSlide,
      label: hero.headline,
      durationMs: PITCH_DURATION_MS,
    },
    ...featured.map((book) => ({
      content: <FeatureSlide key={book._id} book={book} ctaLabel={hero.featureCtaLabel} />,
      label: book.title,
      durationMs: FEATURE_DURATION_MS,
    })),
  ]

  return (
    // Hand-rolled rather than <Section>, and deliberately: the background
    // layers must be siblings of the contained inner div, not inside it, so
    // they can span the full bleed while the slides stay at the site width.
    // Section puts every child inside its inner container. Same two-layer
    // shape, same padding scale — just assembled here.
    <section
      data-slot="section"
      className="relative isolate overflow-hidden px-6 pt-12 pb-8"
    >
      <Image
        src={hero.background ? urlFor(hero.background).width(2400).url() : BACKGROUND_FALLBACK}
        alt=""
        fill
        sizes="100vw"
        priority
        className="-z-20 object-cover"
      />

      {/*
        Two layers, because they do different jobs. The flat wash sets a
        legibility floor everywhere; the gradient darkens the edges further so
        the logo and body text sit on the quietest part of the collage.

        These multiply, so read them together: at the edges roughly 85% of the
        artwork is darkened away, in the centre roughly 75%. Pushing the flat
        wash much past 0.75 loses the collage entirely, which is the whole
        reason it is there.
      */}
      <div className="absolute inset-0 -z-10 bg-black/75" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      {/* Desktop: the carousel. Carousels are poor on phones, so it is hidden
          there in favour of the static splash below. */}
      <HeroCarousel slides={slides} className="mx-auto hidden w-full max-w-[90rem] md:block" />

      {/* Mobile splash: logo, tagline, buttons — static and left-aligned, no
          carousel. alt names the brand here since no headline text does. */}
      <div className="mx-auto w-full max-w-[90rem] md:hidden">
        <Logo size="splash" alt="ND Riot" priority />
        <p className="mt-5 text-2xl leading-tight font-black tracking-tight text-white uppercase">
          {hero.tagline}
        </p>
        {hero.ctas.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {hero.ctas.map((cta, i) => (
              <Button
                key={cta.href}
                asChild
                size="lg"
                variant={i === 0 ? 'default' : 'inverse'}
                className="font-black tracking-wide uppercase"
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

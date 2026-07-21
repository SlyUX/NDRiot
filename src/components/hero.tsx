import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from '@portabletext/react'

import { ContentCard } from '@/components/content-card'
import { HeroCarousel } from '@/components/hero-carousel'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { featureToCard } from '@/lib/card-mappers'
import type { HeroSettings } from '@/lib/site-settings'
import type { FeatureItem } from '@/lib/types'
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
  features: FeatureItem[]
}

/** Fixed so slides of different heights do not make the background jump. */
const SLIDE_MIN_HEIGHT = 'min-h-[26rem] sm:min-h-[30rem]'

/**
 * Shipped artwork, used when Sanity has no hero background.
 *
 * The Sanity field still wins — this is a default in the same sense as the
 * copy defaults in site-settings.ts, not a second source of truth. It exists
 * so the hero is never a bare black box, which is what an empty singleton
 * would otherwise produce on first load.
 */
const BACKGROUND_FALLBACK = '/nd-riot-hero-bkgrd.jpg'

export function Hero({ hero, features }: HeroProps) {
  const featureSlides = features.filter(Boolean).slice(0, 3)

  const pitchSlide = (
    <div className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${SLIDE_MIN_HEIGHT}`}>
      <div className="flex justify-center lg:justify-start">
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

  const slides = [
    pitchSlide,
    ...featureSlides.map((item) => (
      <div
        key={item._id}
        className={`flex items-center ${SLIDE_MIN_HEIGHT}`}
      >
        <div className="w-full max-w-2xl">
          <ContentCard
            {...featureToCard(item)}
            layout="horizontal"
            aspectRatio={item._type === 'creator' ? 'square' : 'cover'}
            className="[&_h3]:text-2xl [&_h3]:text-white sm:[&_h3]:text-3xl"
          />
        </div>
      </div>
    )),
  ]

  const labels = [
    hero.headline,
    ...featureSlides.map((item) => item.title ?? item.name ?? 'Featured'),
  ]

  return (
    <section className="relative isolate -mx-6 overflow-hidden px-6 py-12 sm:py-16">
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

      <HeroCarousel slides={slides} labels={labels} className="mx-auto max-w-6xl" />
    </section>
  )
}

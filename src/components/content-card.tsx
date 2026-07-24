import Image from 'next/image'
import Link from 'next/link'
import { GenreBadge } from '@/components/genre-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'
import { RESTRICTED_RATING } from '@/lib/taxonomy'
import type { BookFormat, Genre, MaturityRating, SanityImage } from '@/lib/types'

/**
 * The one card. Books, creators, columns, interviews and downloads all render
 * through this — see AGENTS.md §4. If a new surface needs a card, add a layout
 * or a prop here rather than forking a second component.
 *
 * Server Component. The reference implementation was `'use client'` only
 * because it accepted `LucideIcon` refs and rendered a save button; ND Riot
 * has neither, so this stays on the server.
 *
 * `date` is a pre-formatted display string, never an ISO value — formatting
 * belongs in the fetch layer so this component stays presentational.
 */

const ASPECT = {
  cover: 'aspect-[2/3]',
  video: 'aspect-video',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
} as const

/**
 * Optional fields are `T | null`, not just `T | undefined`.
 *
 * GROQ returns null for an absent field, so a `?:` prop is a lie the moment
 * the value comes from a projection — and it is the lie that took the creator
 * page down. The generated types in sanity.types.ts model null correctly, so
 * these signatures match them rather than fighting them.
 */
export interface ContentCardProps {
  title: string
  href: string
  image?: SanityImage | null
  /**
   * Fallback alt text. The image's own `alt` from Sanity always wins; this is
   * only used when an editor left it blank. Empty string marks the image
   * decorative — correct when the title directly beside it names the thing.
   */
  imageAlt: string
  /** Small line above the title — a creator name, a byline. */
  eyebrow?: string | null
  /** Up to three. Rendered as linked badges. */
  genres?: Genre[] | null
  /** How it was made. Rendered as an unlinked badge beside the genres. */
  format?: BookFormat | null
  /** Overlaid on the thumbnail — see MaturityOverlay. */
  maturity?: MaturityRating | null
  /** Supporting copy. Comes from Sanity (`shortDescription`, `excerpt`, …). */
  summary?: string | null
  /**
   * How many lines of summary to show before clamping (horizontal layout). The
   * default suits a list row; the homepage creators row raises it so a ~160
   * character bio has room. Static classes only — Tailwind cannot see a
   * computed `line-clamp-${n}`.
   */
  summaryLines?: 2 | 3 | 4
  /**
   * Revealed on hover over the thumbnail (vertical layout, desktop only). Used
   * for a book's description preview — slides up from the bottom of the cover.
   */
  hoverText?: string | null
  /** Pre-formatted for display, e.g. "12 Mar 2026". */
  date?: string | null
  layout?: 'vertical' | 'horizontal' | 'overlay'
  aspectRatio?: keyof typeof ASPECT
  /** Fill the grid cell's height, for equal-height rows. */
  stretch?: boolean
  className?: string
}

/**
 * Sits over the top-right of the thumbnail, so the rating is legible while
 * scanning a grid rather than only after clicking through.
 *
 * Cover art is arbitrary, so neither variant relies on the image underneath:
 * Mature takes the solid pink (black text, 5.69:1), everything else takes a
 * near-opaque background surface (white text, ~20:1). A translucent badge
 * would be unreadable over a light cover.
 */
export function MaturityOverlay({ maturity }: { maturity: MaturityRating }) {
  const restricted = maturity === RESTRICTED_RATING

  return (
    <Badge
      variant={restricted ? 'default' : 'outline'}
      className={cn(
        'absolute top-2 right-2 z-10 px-1.5 py-0 text-[10px] leading-4 tracking-wider uppercase',
        // Black keyline on the pink. Cover art is arbitrary, and pink sitting
        // on a pink-adjacent cover has nothing separating the two — the badge
        // stops reading as a badge. Base Badge already sets `border` at 1px
        // and only leaves it transparent, so this is a colour, not a new edge.
        //
        // border-primary-foreground rather than a black class: it is the same
        // token the text on this badge uses, so the keyline cannot drift away
        // from the on-primary colour if that token ever moves.
        restricted && 'border-primary-foreground',
        !restricted && 'bg-background/90 text-foreground border-white/25 backdrop-blur-sm',
      )}
    >
      {maturity}
    </Badge>
  )
}

/** Genres plus format. Nothing renders if the card has neither. */
export function TaxonomyRow({
  genres,
  format,
  className,
}: {
  genres?: Genre[] | null
  format?: BookFormat | null
  className?: string
}) {
  if (!genres?.length && !format) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {genres?.map((genre) => (
        // noLink because the whole card is already a link — nesting an <a>
        // inside an <a> is invalid and breaks keyboard navigation.
        <GenreBadge key={genre} genre={genre} noLink />
      ))}
      {format && (
        <Badge
          variant="outline"
          className="text-muted-foreground px-2 py-0.5 text-[10px] tracking-wider uppercase"
        >
          {format}
        </Badge>
      )}
    </div>
  )
}

function CardImage({
  image,
  alt,
  width,
  className,
}: {
  image?: SanityImage | null
  alt: string
  width: number
  className?: string
}) {
  if (!image) {
    return (
      <div
        className={cn('bg-muted flex items-center justify-center', className)}
        aria-hidden="true"
      />
    )
  }

  return (
    <Image
      src={urlFor(image).width(width).url()}
      // Editor-supplied alt wins; `alt` is the caller's fallback.
      alt={image.alt ?? alt}
      fill
      sizes={`(max-width: 768px) 100vw, ${width}px`}
      className={cn('object-cover', className)}
    />
  )
}

export function ContentCard({
  title,
  href,
  image,
  imageAlt,
  eyebrow,
  genres,
  format,
  maturity,
  summary,
  summaryLines = 2,
  hoverText,
  date,
  layout = 'vertical',
  aspectRatio = 'cover',
  stretch = false,
  className,
}: ContentCardProps) {
  // Static map — Tailwind scans source text, so the class must appear whole.
  const clampClass = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' }[summaryLines]
  if (layout === 'overlay') {
    return (
      <Link
        href={href}
        className={cn(
          'group focus-visible:ring-ring relative block overflow-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          ASPECT[aspectRatio],
          stretch && 'h-full',
          className,
        )}
      >
        <CardImage
          image={image}
          alt={imageAlt}
          width={600}
          className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
        />
        {maturity && <MaturityOverlay maturity={maturity} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          <TaxonomyRow genres={genres} format={format} />
          <h3 className="text-lg leading-tight font-black text-white">{title}</h3>
          {(eyebrow || date) && (
            <p className="text-xs tracking-wide text-white/70 uppercase">
              {[eyebrow, date].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </Link>
    )
  }

  if (layout === 'horizontal') {
    return (
      <Link
        href={href}
        className={cn(
          'group focus-visible:ring-ring flex gap-4 focus-visible:ring-2 focus-visible:outline-none',
          stretch && 'h-full',
          className,
        )}
      >
        <div className={cn('relative w-24 shrink-0 overflow-hidden sm:w-32', ASPECT[aspectRatio])}>
          <CardImage image={image} alt={imageAlt} width={256} />
          {maturity && <MaturityOverlay maturity={maturity} />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow && <p className="text-primary text-xs tracking-wide uppercase">{eyebrow}</p>}
          <h3 className="leading-tight font-bold group-hover:underline">{title}</h3>
          <TaxonomyRow genres={genres} format={format} className="pt-1" />
          {summary && <p className={cn('text-muted-foreground text-sm', clampClass)}>{summary}</p>}
          {date && <p className="text-muted-foreground text-xs">{date}</p>}
        </div>
      </Link>
    )
  }

  return (
    <Card
      className={cn(
        // p-0 and ring-0 are both fighting shadcn defaults, deliberately:
        //
        // Card applies py-(--card-spacing) with an escape hatch,
        // `has-[>img:first-child]:pt-0`, that only fires for a bare <img> as a
        // DIRECT child. Ours sits inside a Link and a div, so the selector
        // never matches and the image floats 16px below the card's top edge.
        //
        // `border-0` does not remove `ring-1` — a ring is not a border — so
        // the outline survived an override that reads as if it removed it.
        'group gap-0 overflow-hidden border-0 p-0 shadow-none ring-0 bg-transparent',
        stretch && 'h-full',
        className,
      )}
    >
      <Link
        href={href}
        className="focus-visible:ring-ring flex h-full flex-col focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className={cn('bg-muted relative overflow-hidden', ASPECT[aspectRatio])}>
          <CardImage
            image={image}
            alt={imageAlt}
            width={400}
            className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
          />
          {maturity && <MaturityOverlay maturity={maturity} />}
          {/* Description preview, revealed on hover. Slides up from the bottom.
              group-hover is gated behind @media (hover) in Tailwind, so touch
              devices never trigger it — this is a desktop affordance. */}
          {hoverText && (
            <p
              className="absolute inset-x-0 bottom-0 translate-y-full bg-black p-3 text-xs leading-relaxed text-white/90 transition-transform duration-300 ease-out group-hover:translate-y-0 motion-reduce:transition-none"
              aria-hidden="true"
            >
              {hoverText}
            </p>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col gap-1 px-0 pt-3 pb-0">
          <TaxonomyRow genres={genres} format={format} className="mb-1" />
          <h3 className="leading-tight font-bold group-hover:underline">{title}</h3>
          {eyebrow && <p className="text-primary text-xs tracking-wide uppercase">{eyebrow}</p>}
          {summary && <p className="text-muted-foreground line-clamp-2 text-sm">{summary}</p>}
          {date && <p className="text-muted-foreground mt-auto pt-2 text-xs">{date}</p>}
        </CardContent>
      </Link>
    </Card>
  )
}

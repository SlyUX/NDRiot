import Image from 'next/image'
import Link from 'next/link'
import { GenreBadge } from '@/components/genre-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { urlFor } from '@/sanity/image'
import { cn, externalHref } from '@/lib/utils'
import { RESTRICTED_RATING } from '@/lib/taxonomy'
import type { BookFormat, Genre, MaturityRating, SanityImage } from '@/lib/types'
import type { SavedItemType } from '@/sanity/reader-client'

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
  // 4:3 — editorial card thumbnails. The 16:9 header image crops badly this
  // small, so pieces carry a separate squarer thumbnail for previews.
  landscape: 'aspect-[4/3]',
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
  /**
   * Identity for a card-level Save affordance. The mappers set these for books
   * and creators; the grid uses them to render a bookmark chip when it is given
   * a save config. Absent → no Save on the card (columns/editorial/etc.).
   */
  itemType?: SavedItemType
  itemId?: string
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
  /**
   * A live crowdfunding campaign URL. When set, a "Currently Funding" badge
   * links to it from the cover's top-left (opposite the maturity badge).
   */
  fundingUrl?: string | null
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
  /**
   * A one-line average rating for the card footer (convention cards). `rated`
   * false is the "no ratings yet" state — `value` is then the CMS empty label,
   * shown muted and without the star. §3: display only; never an ordering key.
   */
  rating?: { value: string; rated: boolean } | null
  /** Render the date/rating meta above the summary rather than pinned below it.
   *  Convention cards want Location · Name · Date · Rating · Description order. */
  metaFirst?: boolean
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

/**
 * Positioning for the cover art WHEN a funding bar is present: flush to both
 * sides and the bottom, dropped from the top by the bar's height (`top-6` ===
 * the bar's `h-6`) so the banner never covers the art. Explicit edges rather
 * than `inset-0 top-6`, whose `top` override is Tailwind source-order-fragile.
 */
export const FUNDING_BAR_OFFSET = 'inset-x-0 bottom-0 top-6'

/**
 * "Currently Funding" — a full-width bar flush to the top of the cover, centered,
 * linking to the live campaign. Only shown while a `Back` campaign is active
 * (the query resolves `fundingUrl` to null once it expires); the maturity mark
 * is suppressed while it shows, and the art drops below it (FUNDING_BAR_OFFSET).
 *
 * A LINK, so on a card it must be a sibling of the card's own link rather than
 * nested inside it — the caller positions it over a `relative` container.
 *
 * "Currently Funding" is a fixed status label, in the same family as the
 * maturity and genre indicators (code, not CMS): a state the site reports, not
 * editorial copy an editor tunes. Funding green with black text (§9 — white
 * fails on this green).
 */
export function FundingBadge({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={externalHref(url)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'bg-funding focus-visible:ring-ring absolute inset-x-0 top-0 z-20 flex h-6 items-center justify-center text-[10px] font-bold tracking-wider whitespace-nowrap text-black uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      Now Funding
    </a>
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
  fit = 'cover',
  className,
}: {
  image?: SanityImage | null
  alt: string
  width: number
  /** `contain` shows the whole image (horizontal cards, square box) instead of
   *  cropping it to fill. */
  fit?: 'cover' | 'contain'
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
      className={cn(fit === 'contain' ? 'object-contain' : 'object-cover', className)}
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
  fundingUrl,
  summary,
  summaryLines = 2,
  hoverText,
  date,
  rating,
  metaFirst = false,
  layout = 'vertical',
  aspectRatio = 'cover',
  stretch = false,
  className,
}: ContentCardProps) {
  // Static map — Tailwind scans source text, so the class must appear whole.
  const clampClass = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' }[summaryLines]

  // Footer meta shared by both list and grid layouts: the date, then the
  // average rating. A rated con shows a pink star + value; the unrated state
  // shows the muted CMS empty label. (aria-label is a §2-permitted exception —
  // it names the unit the bare number can't.) `pin` bottom-aligns it in a grid
  // cell; when `metaFirst` moves it above the summary, it flows inline instead.
  const metaRow = (pin: boolean) =>
    date || rating ? (
      <div
        className={cn(
          'text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-2 text-xs',
          pin && 'mt-auto',
        )}
      >
        {date && <span>{date}</span>}
        {date && rating && <span aria-hidden="true">·</span>}
        {rating &&
          (rating.rated ? (
            <span
              className="whitespace-nowrap"
              aria-label={`Average rating ${rating.value} out of 5`}
            >
              <span aria-hidden="true" className="text-primary">
                ★
              </span>{' '}
              {rating.value}
            </span>
          ) : (
            <span>{rating.value}</span>
          ))}
      </div>
    ) : null
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
        {/* Horizontal thumbnails are always square, and show the whole image
            rather than cropping it — a portrait cover or a landscape logo sits
            letterboxed in the square rather than filling it. */}
        <div className="bg-muted relative aspect-square w-24 shrink-0 overflow-hidden sm:w-32">
          <CardImage image={image} alt={imageAlt} width={256} fit="contain" />
          {maturity && <MaturityOverlay maturity={maturity} />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow && <p className="text-primary text-xs tracking-wide uppercase">{eyebrow}</p>}
          <h3 className="leading-tight font-bold group-hover:underline">{title}</h3>
          <TaxonomyRow genres={genres} format={format} className="pt-1" />
          {metaFirst && metaRow(false)}
          {summary && <p className={cn('text-muted-foreground text-sm', clampClass)}>{summary}</p>}
          {!metaFirst && metaRow(false)}
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
        // `relative` so the funding badge — a sibling of the Link, not nested
        // inside it (anchors cannot nest) — anchors to the card's top-left,
        // which is the cover's top-left since the image leads the card.
        'group relative gap-0 overflow-hidden border-0 p-0 shadow-none ring-0 bg-transparent',
        stretch && 'h-full',
        className,
      )}
    >
      {fundingUrl && <FundingBadge url={fundingUrl} />}
      <Link
        href={href}
        className="focus-visible:ring-ring flex h-full flex-col focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className={cn('bg-muted relative overflow-hidden', ASPECT[aspectRatio])}>
          {/* When a funding bar tops the cover, drop the art below it so the
              banner never covers the artwork (FUNDING_BAR_OFFSET === bar h-6). */}
          <div className={cn('absolute', fundingUrl ? FUNDING_BAR_OFFSET : 'inset-0')}>
            <CardImage
              image={image}
              alt={imageAlt}
              width={400}
              className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
            />
          </div>
          {/* Maturity is suppressed while funding shows — both live at the top,
              and the campaign is the more time-sensitive thing to surface. */}
          {maturity && !fundingUrl && <MaturityOverlay maturity={maturity} />}
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
          {metaFirst && metaRow(false)}
          {summary && <p className="text-muted-foreground line-clamp-2 text-sm">{summary}</p>}
          {!metaFirst && metaRow(true)}
        </CardContent>
      </Link>
    </Card>
  )
}

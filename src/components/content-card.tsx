import Image from 'next/image'
import Link from 'next/link'
import { GenreBadge } from '@/components/genre-badge'
import { Card, CardContent } from '@/components/ui/card'
import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'
import type { SanityImage } from '@/lib/types'

/**
 * The one card. Books, creators, columns, interviews and downloads all render
 * through this — see AGENTS.md §3. If a new surface needs a card, add a layout
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

export interface ContentCardProps {
  title: string
  href: string
  image?: SanityImage
  /**
   * Fallback alt text. The image's own `alt` from Sanity always wins; this is
   * only used when an editor left it blank. Empty string marks the image
   * decorative — correct when the title directly beside it names the thing.
   */
  imageAlt: string
  /** Small line above the title — a creator name, a byline. */
  eyebrow?: string
  /** Genre tag, rendered as a linked badge. */
  genre?: string
  /** Supporting copy. Comes from Sanity (`shortDescription`, `excerpt`, …). */
  summary?: string
  /** Pre-formatted for display, e.g. "12 Mar 2026". */
  date?: string
  layout?: 'vertical' | 'horizontal' | 'overlay'
  aspectRatio?: keyof typeof ASPECT
  /** Fill the grid cell's height, for equal-height rows. */
  stretch?: boolean
  className?: string
}

function CardImage({
  image,
  alt,
  width,
  className,
}: {
  image?: SanityImage
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
  genre,
  summary,
  date,
  layout = 'vertical',
  aspectRatio = 'cover',
  stretch = false,
  className,
}: ContentCardProps) {
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          {genre && <GenreBadge genre={genre} variant="overlay" noLink />}
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
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow && (
            <p className="text-primary text-xs tracking-wide uppercase">{eyebrow}</p>
          )}
          <h3 className="leading-tight font-bold group-hover:underline">{title}</h3>
          {summary && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{summary}</p>
          )}
          {date && <p className="text-muted-foreground text-xs">{date}</p>}
        </div>
      </Link>
    )
  }

  return (
    <Card
      className={cn(
        'group gap-0 overflow-hidden border-0 bg-transparent shadow-none',
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
        </div>
        <CardContent className="flex flex-1 flex-col gap-1 px-0 pt-3 pb-0">
          {genre && (
            <div className="mb-1">
              <GenreBadge genre={genre} noLink />
            </div>
          )}
          <h3 className="leading-tight font-bold group-hover:underline">{title}</h3>
          {eyebrow && (
            <p className="text-primary text-xs tracking-wide uppercase">{eyebrow}</p>
          )}
          {summary && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{summary}</p>
          )}
          {date && <p className="text-muted-foreground mt-auto pt-2 text-xs">{date}</p>}
        </CardContent>
      </Link>
    </Card>
  )
}

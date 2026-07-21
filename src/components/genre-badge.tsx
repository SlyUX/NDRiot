import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Renders a book genre as a badge, linked to its category page.
 *
 * Genres are free-text tags on `book.genres`, so the slug is derived rather
 * than stored. `GENRE_BOOKS_QUERY` matches on the raw genre string, so the
 * href carries the encoded original — not the slug — to stay in sync.
 */

export interface GenreBadgeProps {
  genre: string
  variant?: 'default' | 'outline' | 'overlay'
  size?: 'sm' | 'md'
  /** Skip the link — e.g. when already on that genre's page. */
  noLink?: boolean
  className?: string
}

export function GenreBadge({
  genre,
  variant = 'default',
  size = 'sm',
  noLink = false,
  className,
}: GenreBadgeProps) {
  const badge = (
    <Badge
      variant={variant === 'overlay' ? 'default' : variant === 'default' ? 'secondary' : 'outline'}
      className={cn(
        size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[10px] tracking-wider uppercase',
        // Overlay sits on top of cover art, so it needs its own translucent
        // treatment rather than a solid token background.
        variant === 'overlay' && 'border-0 bg-black/60 text-white backdrop-blur-sm',
        !noLink && 'transition-colors',
        className,
      )}
    >
      {genre}
    </Badge>
  )

  if (noLink) return badge

  return (
    <Link
      href={`/categories/${encodeURIComponent(genre)}`}
      className="focus-visible:ring-ring rounded-none focus-visible:ring-2 focus-visible:outline-none"
    >
      {badge}
    </Link>
  )
}

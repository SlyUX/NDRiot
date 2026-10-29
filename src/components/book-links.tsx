import { MapPin } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/card-mappers'
import { PROMINENT_LINK_KINDS } from '@/lib/taxonomy'
import type { BookLink } from '@/lib/types'
import { cn, externalHref } from '@/lib/utils'

/**
 * Every route to a book, ordered by what serves the reader.
 *
 * Replaces BuyLinks. ND Riot exposes and redirects rather than selling, so
 * grouping everything under "buy" was wrong twice over: a free read is not a
 * purchase, and Kickstarter needed its own special-cased field beside it.
 *
 * Free reads and live campaigns lead, because those are the two a reader most
 * wants to know about — one costs nothing, the other expires. A `Back`
 * campaign carries an optional end date: it shows an "Ends …" deadline while
 * live and disappears once past (the query flags `expired`), so a finished
 * campaign never lingers as a stale call to action.
 */

/** Falls back to the domain so a link with no label is still legible. */
function labelFor(link: BookLink): string {
  if (link.label?.trim()) return link.label.trim()
  try {
    return new URL(link.url).hostname.replace(/^www\./, '')
  } catch {
    return link.kind
  }
}

/** A physical store (spinner rack) that carries this item — one "In person" row. */
export interface IrlLocation {
  href: string
  logoUrl: string | null
  storeName: string
  state: string
}

export default function BookLinks({
  links,
  heading,
  framed = false,
  irl,
  onlineLabel,
  irlLabel,
}: {
  links?: BookLink[] | null
  /** Optional label over the links. Rendered only when links actually show. */
  heading?: string
  /**
   * Wrap the block in a charcoal panel with a 15px inset, setting the links
   * apart as their own grouped section (§9's grouped-section surface). Off by
   * default so the component stays a bare list unless a caller asks to frame it.
   */
  framed?: boolean
  /**
   * Physical stores (spinner racks) that carry this item — rendered as an "In
   * person" column of logo · store · state beneath the online links. Optional;
   * magazine pages don't pass it.
   */
  irl?: IrlLocation[] | null
  /** Sub-labels, shown only when BOTH online links and IRL locations exist — a
   *  single-category box stays unlabeled under the main heading. */
  onlineLabel?: string
  irlLabel?: string
}) {
  const hasIrl = Boolean(irl?.length)

  // A past campaign is not an action — drop expired `Back` links entirely.
  const live = (links ?? []).filter((l) => !(l.kind === 'Back' && l.expired))

  const prominent = live.filter((l) => PROMINENT_LINK_KINDS.includes(l.kind))
  const rest = live.filter((l) => !PROMINENT_LINK_KINDS.includes(l.kind))

  const hasOnline = prominent.length > 0 || rest.length > 0
  const showSub = hasOnline && hasIrl
  if (!hasOnline && !hasIrl) return null

  return (
    <div className={cn('space-y-3', framed && 'bg-charcoal p-[15px]')}>
      {/* A group label, not a document heading: on the book page this block sits
          in the cover column, which precedes the <h1> title in source order, so
          a real heading here would land before the page's h1. A styled <p>
          keeps the look without breaking the heading outline (§10). */}
      {heading && <p className="text-xs font-black tracking-widest uppercase">{heading}</p>}
      {showSub && onlineLabel && (
        <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
          {onlineLabel}
        </p>
      )}
      {prominent.length > 0 && (
        <div className="flex flex-wrap items-start gap-3">
          {prominent.map((link) => {
            // A live campaign is the one time-sensitive route, so it wears the
            // funding green (black text — white fails AA on it, §9) rather than
            // the default pink, matching the "Currently Funding" badge on covers.
            const campaign = link.kind === 'Back'
            const deadline = campaign && link.endDate ? formatDate(link.endDate) : null
            return (
              <div key={link.url} className="flex flex-col gap-1">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'font-black tracking-wide uppercase',
                    campaign && 'bg-funding text-black hover:bg-funding/90',
                  )}
                >
                  <a href={externalHref(link.url)} target="_blank" rel="noopener noreferrer">
                    {/* The kind is said aloud, not just implied by styling — a
                        prominent button is not self-explanatory to a screen
                        reader, and "free" is the part that matters. */}
                    <span className="sr-only">{link.kind}: </span>
                    {labelFor(link)}
                  </a>
                </Button>
                {deadline && (
                  <span className="text-funding text-xs font-bold tracking-wide uppercase">
                    Ends {deadline}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rest.map((link) => (
            <Button key={link.url} asChild variant="outline" size="sm">
              <a href={externalHref(link.url)} target="_blank" rel="noopener noreferrer">
                <span className="sr-only">{link.kind}: </span>
                {labelFor(link)}
              </a>
            </Button>
          ))}
        </div>
      )}

      {/* In person — the physical stores (spinner racks) carrying this item. A
          column of logo · store name · state, each row linking to the shelf. */}
      {hasIrl && (
        <div className="space-y-2">
          {showSub && irlLabel && (
            <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
              {irlLabel}
            </p>
          )}
          <ul className="space-y-1.5">
            {irl!.map((loc) => (
              <li key={loc.href}>
                <Link
                  href={loc.href}
                  className="group focus-visible:ring-ring flex items-center gap-2.5 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-background/50 flex size-[30px] shrink-0 items-center justify-center overflow-hidden">
                    {loc.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- cross-dataset asset, served from the CDN; next/image isn't configured for it
                      <img src={loc.logoUrl} alt="" className="size-full object-contain" />
                    ) : (
                      <MapPin className="text-muted-foreground size-3.5" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold group-hover:text-primary">
                    {loc.storeName}
                  </span>
                  <span className="text-muted-foreground text-xs tracking-widest uppercase">
                    {loc.state}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

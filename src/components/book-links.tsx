import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/card-mappers'
import { PROMINENT_LINK_KINDS } from '@/lib/taxonomy'
import type { BookLink } from '@/lib/types'
import { cn } from '@/lib/utils'

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

export default function BookLinks({ links }: { links?: BookLink[] | null }) {
  if (!links?.length) return null

  // A past campaign is not an action — drop expired `Back` links entirely.
  const live = links.filter((l) => !(l.kind === 'Back' && l.expired))

  const prominent = live.filter((l) => PROMINENT_LINK_KINDS.includes(l.kind))
  const rest = live.filter((l) => !PROMINENT_LINK_KINDS.includes(l.kind))

  if (prominent.length === 0 && rest.length === 0) return null

  return (
    <div className="space-y-3">
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
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
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
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <span className="sr-only">{link.kind}: </span>
                {labelFor(link)}
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

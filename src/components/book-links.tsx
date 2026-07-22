import { Button } from '@/components/ui/button'
import { PROMINENT_LINK_KINDS } from '@/lib/taxonomy'
import type { BookLink } from '@/lib/types'

/**
 * Every route to a book, ordered by what serves the reader.
 *
 * Replaces BuyLinks. ND Riot exposes and redirects rather than selling, so
 * grouping everything under "buy" was wrong twice over: a free read is not a
 * purchase, and Kickstarter needed its own special-cased field beside it.
 *
 * Free reads and live campaigns lead, because those are the two a reader most
 * wants to know about — one costs nothing, the other expires.
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

  const prominent = links.filter((l) => PROMINENT_LINK_KINDS.includes(l.kind))
  const rest = links.filter((l) => !PROMINENT_LINK_KINDS.includes(l.kind))

  return (
    <div className="space-y-3">
      {prominent.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {prominent.map((link) => (
            <Button key={link.url} asChild size="lg" className="font-black tracking-wide uppercase">
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {/* The kind is said aloud, not just implied by styling — a
                    prominent button is not self-explanatory to a screen
                    reader, and "free" is the part that matters. */}
                <span className="sr-only">{link.kind}: </span>
                {labelFor(link)}
              </a>
            </Button>
          ))}
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

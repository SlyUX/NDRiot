import { SectionHeading } from '@/components/section-heading'
import { formatDate } from '@/lib/card-mappers'
import type { FeedEntry } from '@/lib/feed-parse'
import { externalHref } from '@/lib/utils'

/**
 * A profile's latest syndicated items — a creator's or outlet's own RSS/Atom
 * feed, shown by invitation (AGENTS.md §3's consent line for media). Purely
 * presentational: the server page fetches and parses the feed, this renders it.
 *
 * Titles link out — new tab, `nofollow` (we vouch for the invitation, not the
 * link target) — and only when the URL is a safe http(s) link, so a hostile
 * feed can't smuggle a `javascript:` href through.
 */
export function FeedPreview({
  heading,
  entries,
  limit = 5,
}: {
  heading: string
  entries: FeedEntry[]
  limit?: number
}) {
  if (entries.length === 0) return null

  return (
    <section>
      <SectionHeading as="h2" size="sm">
        {heading}
      </SectionHeading>
      <ul className="space-y-3">
        {entries.slice(0, limit).map((entry) => {
          const href = externalHref(entry.link)
          const date = formatDate(entry.date)
          return (
            <li key={entry.link} className="flex flex-col gap-0.5">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="focus-visible:ring-ring hover:text-primary text-sm leading-snug font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {entry.title}
                </a>
              ) : (
                <span className="text-sm leading-snug font-bold">{entry.title}</span>
              )}
              {date && (
                <time dateTime={entry.date ?? undefined} className="text-muted-foreground text-xs">
                  {date}
                </time>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

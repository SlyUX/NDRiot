import Link from 'next/link'

import { SectionHeading } from '@/components/section-heading'
import { formatDate } from '@/lib/card-mappers'
import type { UpdateFeedItem } from '@/lib/types'

/**
 * The reader's update feed on /me — updates from comics and creators they saved
 * (Save = Follow), newest first. Presentational; the ordering is pure recency,
 * never ranked or counted (§3). Headings and the empty line come from Sanity.
 *
 * Shows an empty state when the reader follows someone but no one has posted yet
 * — the section only renders at all when they have follows, so it doubles as a
 * quiet nudge that following surfaces updates here.
 */
export function UpdateFeed({
  heading,
  emptyLabel,
  updates,
}: {
  heading: string
  emptyLabel: string
  updates: UpdateFeedItem[]
}) {
  return (
    <div>
      <SectionHeading as="h2" size="sm">
        {heading}
      </SectionHeading>
      {updates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <ul className="border-border divide-border divide-y border-t">
          {updates.map((update) => {
            const href = update.targetSlug
              ? update.targetType === 'book'
                ? `/books/${update.targetSlug}`
                : `/creators/${update.targetSlug}`
              : null
            const date = formatDate(update.publishedAt)
            const name = update.targetName ?? 'Untitled'
            return (
              <li key={update._id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                  <span className="text-primary font-black tracking-widest uppercase">{update.kind}</span>
                  {href ? (
                    <Link href={href} className="hover:text-primary font-bold transition-colors">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-bold">{name}</span>
                  )}
                  {date && <span className="text-muted-foreground ml-auto">{date}</span>}
                </div>
                <p className="mt-2 text-sm">{update.body}</p>
                {update.mentions && update.mentions.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {update.mentions.map((mention) => (
                      <li key={mention._id}>
                        <Link
                          href={
                            mention._type === 'convention'
                              ? `/conventions/${mention.slug}`
                              : `/creators/${mention.slug}`
                          }
                          className="border-border hover:border-primary hover:text-primary inline-block border px-2 py-0.5 text-xs transition-colors"
                        >
                          {mention.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

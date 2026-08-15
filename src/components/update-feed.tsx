import { SectionHeading } from '@/components/section-heading'
import { UpdateItemContent } from '@/components/update-item-content'
import { UpdateRow, type UpdateOwnerConfig } from '@/components/update-row'
import type { UpdateFeedItem } from '@/lib/types'

/**
 * An update feed, newest first — pure recency, never ranked or counted (§3).
 * Read-only by default (the reader's /me "Your Feed", a creator's public
 * profile). When `owner` labels are passed — a creator viewing their OWN
 * profile — each update becomes an interactive row with a delete + in-place undo.
 */
export function UpdateFeed({
  heading,
  emptyLabel,
  updates,
  owner,
}: {
  heading: string
  emptyLabel: string
  updates: UpdateFeedItem[]
  /** Present only when the viewer owns these updates — enables edit + delete/undo. */
  owner?: UpdateOwnerConfig
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
          {updates.map((update) =>
            owner ? (
              <UpdateRow key={update._id} update={update} config={owner} />
            ) : (
              <li key={update._id} className="py-4">
                <UpdateItemContent update={update} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

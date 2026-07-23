'use client'

import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

/**
 * A grid that shows the first `initialCount` cells and reveals the rest on a
 * "view more" press. The homepage uses it to open with two rows and let the
 * reader ask for the next two.
 *
 * The cells are rendered on the server and passed through as children — this
 * component only toggles their visibility, so the cards keep server-rendering
 * and nothing about them ships to the browser as logic. Hidden cells stay in
 * the DOM (hidden, so out of layout but present), which keeps them crawlable
 * and means expanding is instant rather than a fetch.
 *
 * Every cell is still in the page, so this is a progressive reveal, not
 * pagination — "view all" (the heading link to the full listing) remains the
 * route to everything, uncapped.
 */
export function ExpandableGrid({
  children,
  initialCount,
  moreLabel,
  gridClassName,
}: {
  children: ReactNode
  initialCount: number
  /** Copy, from the caller — see AGENTS.md §2. */
  moreLabel: string
  gridClassName: string
}) {
  const [expanded, setExpanded] = useState(false)
  const cells = Children.toArray(children)
  const hasMore = cells.length > initialCount

  return (
    <>
      <div className={gridClassName}>
        {cells.map((cell, i) => {
          const hide = !expanded && i >= initialCount
          // Add `hidden` to the cell itself rather than wrap it, so it stays a
          // direct grid child and the column layout is unaffected.
          return hide && isValidElement(cell)
            ? cloneElement(cell as ReactElement<{ hidden?: boolean }>, { hidden: true })
            : cell
        })}
      </div>

      {hasMore && !expanded && (
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded(true)}
            className="font-bold tracking-wide uppercase"
          >
            {moreLabel}
          </Button>
        </div>
      )}
    </>
  )
}

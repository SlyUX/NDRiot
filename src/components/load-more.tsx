import Link from 'next/link'

import { Button } from '@/components/ui/button'
import type { SearchParams } from '@/lib/filters'

/**
 * "Load more (N)" for a server-paginated list.
 *
 * No client JS: it is a link that bumps the `limit` URL param by a page, and
 * Next re-renders the list with more rows. `scroll={false}` keeps the reader
 * where they were. Renders nothing once everything is shown, so a caller can
 * drop it in unconditionally.
 *
 * The count in the label is what is still hidden — the honest signal for how
 * much a search turned up beyond the first page.
 */
export function LoadMore({
  searchParams,
  shown,
  total,
  pageSize,
  param = 'limit',
  label = 'Load more',
}: {
  /** The page's current search params, carried through so filters survive. */
  searchParams: SearchParams
  /** How many rows are currently rendered. */
  shown: number
  /** The full count behind the filter. */
  total: number
  /** How many more to reveal per press. */
  pageSize: number
  /** The URL key to grow; distinct per row when a page has several. */
  param?: string
  label?: string
}) {
  if (shown >= total) return null

  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue
    if (Array.isArray(value)) value.forEach((v) => next.append(key, v))
    else next.set(key, value)
  }
  next.set(param, String(shown + pageSize))

  return (
    <div className="flex justify-center pt-8">
      <Button asChild variant="outline" size="lg" className="font-bold tracking-wide uppercase">
        <Link href={`?${next.toString()}`} scroll={false}>
          {label} ({total - shown})
        </Link>
      </Button>
    </div>
  )
}

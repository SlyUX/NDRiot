'use client'

import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'

import { removeSaveAction } from '@/app/actions/saves'

/**
 * A saved item on the dashboard with a destructive Remove. Two layouts: `row` (a
 * feed-style line with a title) and `tile` (a cover that links to the item, with
 * the Remove tucked in a corner — for the wrapping cover grids). Removing is
 * optimistic (it hides at once), then reconciled with a router refresh. The
 * thumbnail is a slot so the server page keeps using next/image.
 */
export function SavedItemRow({
  itemId,
  title,
  href,
  thumb,
  removeLabel,
  layout = 'row',
}: {
  itemId: string
  title: string
  href: string | null
  thumb: ReactNode
  removeLabel: string
  layout?: 'row' | 'tile'
}) {
  const [removed, setRemoved] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (removed) return null

  function onRemove() {
    setRemoved(true) // optimistic
    startTransition(async () => {
      await removeSaveAction(itemId)
      router.refresh()
    })
  }

  if (layout === 'tile') {
    return (
      <li className="relative">
        {href ? (
          <Link
            href={href}
            aria-label={title}
            className="focus-visible:ring-ring block focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
          >
            {thumb}
          </Link>
        ) : (
          thumb
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={removeLabel}
          className="focus-visible:ring-ring hover:text-primary absolute top-0 right-0 inline-flex bg-black/70 p-1 text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </li>
    )
  }

  return (
    <li className="border-border flex items-center gap-3 border-b py-3">
      {thumb}
      {href ? (
        <Link
          href={href}
          className="hover:text-primary min-w-0 flex-1 truncate text-sm font-bold transition-colors"
        >
          {title}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{title}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label={removeLabel}
        className="focus-visible:ring-ring hover:text-primary shrink-0 text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </li>
  )
}

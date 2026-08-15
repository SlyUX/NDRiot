'use client'

import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'

import { removeSaveAction, toggleSaveAction } from '@/app/actions/saves'
import { useToast } from '@/components/toast-provider'

/**
 * A saved item on the dashboard with a destructive Remove. Two layouts: `row` (a
 * feed-style line with a title) and `tile` (a cover that links to the item, with
 * the Remove tucked in a corner — for the wrapping cover grids).
 *
 * Remove is optimistic (it hides at once) and commits immediately, then raises
 * an Undo toast — clicking Undo un-hides it and re-saves. "Commit, then undo" so
 * nothing depends on a timer holding un-saved data (navigating away can't lose
 * it). The thumbnail is a slot so the server page keeps using next/image.
 */
export function SavedItemRow({
  itemId,
  itemType,
  title,
  href,
  thumb,
  removeLabel,
  removedLabel,
  undoLabel,
  layout = 'row',
}: {
  itemId: string
  itemType: 'book' | 'creator'
  title: string
  href: string | null
  thumb: ReactNode
  removeLabel: string
  removedLabel: string
  undoLabel: string
  layout?: 'row' | 'tile'
}) {
  const [removed, setRemoved] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const pathname = usePathname()

  if (removed) return null

  function onRemove() {
    setRemoved(true) // optimistic hide
    startTransition(async () => {
      await removeSaveAction(itemId)
    })
    toast(`${removedLabel} ${title}`, {
      label: undoLabel,
      onClick: () => {
        setRemoved(false) // un-hide (the row is still mounted, just hidden)
        startTransition(async () => {
          await toggleSaveAction(itemType, itemId, pathname)
        })
      },
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

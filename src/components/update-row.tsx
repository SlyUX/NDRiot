'use client'

import { useRef, useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

import { deleteUpdate, restoreUpdate } from '@/app/actions/updates'
import { UpdateItemContent } from '@/components/update-item-content'
import type { UpdateFeedItem } from '@/lib/types'

/**
 * An update on the owner's own profile — with a delete control. Delete commits
 * at once and the row becomes an in-place "Deleted — Undo" for a few seconds;
 * Undo re-creates it (same _id + publishedAt, so it lands back in place). "Commit,
 * then undo" so nothing rides a timer holding data — matching the saved shelf.
 */
const UNDO_MS = 6000

export type UpdateOwnerLabels = {
  deleteLabel: string
  deletedLabel: string
  undoLabel: string
}

export function UpdateRow({
  update,
  labels,
}: {
  update: UpdateFeedItem
  labels: UpdateOwnerLabels
}) {
  const [state, setState] = useState<'visible' | 'deleting' | 'gone'>('visible')
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (state === 'gone') return null

  function onDelete() {
    setState('deleting')
    startTransition(async () => {
      await deleteUpdate(update._id)
    })
    timer.current = setTimeout(() => setState('gone'), UNDO_MS)
  }

  function onUndo() {
    if (timer.current) clearTimeout(timer.current)
    setState('visible')
    startTransition(async () => {
      await restoreUpdate({
        id: update._id,
        kind: update.kind,
        body: update.body,
        targetId: update.targetId,
        mentionIds: (update.mentions ?? []).map((mention) => mention._id),
        publishedAt: update.publishedAt,
      })
    })
  }

  if (state === 'deleting') {
    return (
      <li className="flex items-center justify-between gap-3 py-4">
        <span className="text-foreground text-sm font-bold">{labels.deletedLabel}</span>
        <button
          type="button"
          onClick={onUndo}
          className="text-primary focus-visible:ring-ring shrink-0 text-sm font-black tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {labels.undoLabel}
        </button>
      </li>
    )
  }

  return (
    <li className="py-4">
      <UpdateItemContent
        update={update}
        action={
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label={labels.deleteLabel}
            className="hover:text-destructive focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button>
        }
      />
    </li>
  )
}

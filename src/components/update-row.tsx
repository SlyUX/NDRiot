'use client'

import { useRef, useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

import { deleteUpdate, restoreUpdate } from '@/app/actions/updates'
import { EditUpdateDialog } from '@/components/edit-update-dialog'
import { UpdateItemContent } from '@/components/update-item-content'
import type { ComposerLabels, MentionOption } from '@/components/update-composer'
import type { UpdateFeedItem } from '@/lib/types'

/**
 * An update on the owner's own profile — with a delete control. Delete commits
 * at once and the row becomes an in-place "Deleted — Undo" for a few seconds;
 * Undo re-creates it (same _id + publishedAt, so it lands back in place). "Commit,
 * then undo" so nothing rides a timer holding data — matching the saved shelf.
 */
const UNDO_MS = 6000

export type UpdateOwnerConfig = {
  deleteLabel: string
  deletedLabel: string
  undoLabel: string
  /** Edit: the pencil label + everything the composer needs, pre-built. */
  editLabel: string
  editKinds: readonly string[]
  editMentions: MentionOption[]
  editLabels: ComposerLabels
}

export function UpdateRow({
  update,
  config,
}: {
  update: UpdateFeedItem
  config: UpdateOwnerConfig
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
        <span className="text-foreground text-sm font-bold">{config.deletedLabel}</span>
        <button
          type="button"
          onClick={onUndo}
          className="text-primary focus-visible:ring-ring shrink-0 text-sm font-black tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {config.undoLabel}
        </button>
      </li>
    )
  }

  return (
    <li className="py-4">
      <UpdateItemContent
        update={update}
        action={
          <span className="flex items-center gap-2.5">
            <EditUpdateDialog
              update={update}
              kinds={config.editKinds}
              mentions={config.editMentions}
              labels={config.editLabels}
              triggerLabel={config.editLabel}
            />
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              aria-label={config.deleteLabel}
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </span>
        }
      />
    </li>
  )
}

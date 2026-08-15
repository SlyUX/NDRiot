'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'

import {
  UpdateComposer,
  type ComposerLabels,
  type MentionOption,
} from '@/components/update-composer'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { UpdateFeedItem } from '@/lib/types'

/**
 * Edit one of your updates — a pencil that opens the composer (in edit-mode)
 * pre-filled with the update. On a successful save the dialog closes and the
 * page refreshes so the edited row shows its new content.
 */
export function EditUpdateDialog({
  update,
  kinds,
  mentions,
  labels,
  triggerLabel,
}: {
  update: UpdateFeedItem
  kinds: readonly string[]
  mentions: MentionOption[]
  labels: ComposerLabels
  triggerLabel: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className="text-muted-foreground hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle className="sr-only">{labels.heading}</DialogTitle>
        <UpdateComposer
          targets={[]}
          kinds={kinds}
          mentions={mentions}
          labels={labels}
          edit={{
            updateId: update._id,
            kind: update.kind,
            body: update.body,
            mentionIds: (update.mentions ?? []).map((mention) => mention._id),
          }}
          onSuccess={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import {
  UpdateComposer,
  type ComposerLabels,
  type ComposerTarget,
  type MentionOption,
} from '@/components/update-composer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

/**
 * The "Post an Update" flow as a modal — the trigger sits under the creator's
 * profile block, and the composer (which is unchanged) opens in a dialog. The
 * dialog's accessible title reuses the composer's heading (visually hidden here,
 * since the composer shows its own).
 */
export function PostUpdateDialog({
  targets,
  kinds,
  mentions,
  labels,
}: {
  targets: ComposerTarget[]
  kinds: readonly string[]
  mentions: MentionOption[]
  labels: ComposerLabels
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="inverse" className="font-black tracking-wide uppercase">
          <Plus aria-hidden="true" className="size-4" />
          {labels.heading}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle className="sr-only">{labels.heading}</DialogTitle>
        {/* Composer holds the "posted" confirmation for 2s, then onSuccess closes. */}
        <UpdateComposer
          targets={targets}
          kinds={kinds}
          mentions={mentions}
          labels={labels}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

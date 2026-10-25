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
import { cn } from '@/lib/utils'

/**
 * The "Post an Update" flow as a modal — the trigger sits under the creator's
 * profile block, and the composer (which is unchanged) opens in a dialog. The
 * dialog's accessible title reuses the composer's heading (visually hidden here,
 * since the composer shows its own).
 *
 * The trigger button is built HERE, inside this client component, on purpose:
 * passing a Server-Component-built element into `<DialogTrigger asChild>`
 * (Radix Slot) intermittently throws "failed to slot onto its children" during
 * RSC streaming — the element arrives as a Flight lazy reference Slot can't read
 * (radix-ui#4150). Callers pass plain props (label, width) instead of an element.
 */
export function PostUpdateDialog({
  targets,
  kinds,
  mentions,
  labels,
  triggerLabel,
  fullWidthTrigger = false,
}: {
  targets: ComposerTarget[]
  kinds: readonly string[]
  mentions: MentionOption[]
  labels: ComposerLabels
  /** Trigger button label. Defaults to the composer heading. */
  triggerLabel?: string
  /** Stretch the trigger full-width (the dashboard Activity tab). */
  fullWidthTrigger?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="inverse"
          className={cn(
            'font-black tracking-wide uppercase',
            fullWidthTrigger && 'w-full',
          )}
        >
          <Plus aria-hidden="true" className="size-4" />
          {triggerLabel ?? labels.heading}
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

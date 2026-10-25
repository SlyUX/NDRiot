'use client'

import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'

import {
  StripIntakeForm,
  type OwnedCreator,
  type SeriesOption,
  type StripIntakeInitial,
} from '@/components/strip-intake-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type {
  CreatorIntakeSettings,
  ReviewNoticeSettings,
  StripIntakeSettings,
} from '@/lib/site-settings'

/**
 * "Post a strip" as a modal on the creator dashboard — the form is short enough
 * to live in a dialog rather than its own page. A discovered dashboard feature:
 * the trigger sits with the other per-creator actions, and the whole intake
 * (image + a few fields) opens in place. Reuses `StripIntakeForm` verbatim; the
 * success state (confirmation + review notice) renders inside the dialog, so
 * there's no auto-close — the "why there's a wait" note is the point of landing.
 */
export function StripComposer({
  copy,
  common,
  reviewNotice,
  creator,
  series,
  className,
  initial,
  editTriggerLabel,
}: {
  copy: StripIntakeSettings
  common: CreatorIntakeSettings
  reviewNotice: ReviewNoticeSettings
  creator: OwnedCreator
  series: SeriesOption[]
  /** Applied to the default trigger button — e.g. `w-full` to fill the card. */
  className?: string
  /** Prefilled values → the dialog opens in edit mode. */
  initial?: StripIntakeInitial
  /**
   * When set, renders the icon-only edit chip (aria-label = this) instead of
   * the default "+ STRIP" button. Built here, inside this client component, on
   * purpose: a Server Component must not hand a built element to
   * `<DialogTrigger asChild>` (Radix Slot) — it intermittently fails to slot
   * across the RSC boundary (radix-ui#4150).
   */
  editTriggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(initial)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editTriggerLabel ? (
          <button
            type="button"
            aria-label={editTriggerLabel}
            className="focus-visible:ring-ring inline-flex bg-black/70 p-1.5 text-white transition-colors hover:text-white/70 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
        ) : (
          <Button
            variant="inverse"
            size="sm"
            className={cn("font-black tracking-wide uppercase", className)}
          >
            <Plus aria-hidden="true" className="size-4" />
            {copy.composerButton}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle>{editing ? copy.editHeading : copy.heading}</DialogTitle>
        {!editing && <p className="text-muted-foreground text-sm">{copy.intro}</p>}
        <StripIntakeForm
          copy={copy}
          common={common}
          reviewNotice={reviewNotice}
          creator={creator}
          series={series}
          initial={initial}
        />
      </DialogContent>
    </Dialog>
  )
}

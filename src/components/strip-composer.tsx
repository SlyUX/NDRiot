'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import {
  StripIntakeForm,
  type OwnedCreator,
  type SeriesOption,
} from '@/components/strip-intake-form'
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
}: {
  copy: StripIntakeSettings
  common: CreatorIntakeSettings
  reviewNotice: ReviewNoticeSettings
  creator: OwnedCreator
  series: SeriesOption[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="inverse" size="sm">
          <Plus aria-hidden="true" className="size-4" />
          {copy.heading}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle>{copy.heading}</DialogTitle>
        <p className="text-muted-foreground text-sm">{copy.intro}</p>
        <StripIntakeForm
          copy={copy}
          common={common}
          reviewNotice={reviewNotice}
          creator={creator}
          series={series}
        />
      </DialogContent>
    </Dialog>
  )
}

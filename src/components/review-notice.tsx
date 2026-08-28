import type { ReviewNoticeSettings } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

/**
 * The submit → review → publish explainer, shown on every intake flow (creator,
 * comic, media, strip). Copy is CMS-managed (§2) via one shared `reviewNotice`
 * settings group, so the wording is identical everywhere and edited in one place.
 *
 * Two placements, one per moment in the flow:
 * - `compact` sits on the form (one line, near submit) — sets the expectation
 *   before someone commits, so the wait is never a surprise.
 * - `full` is the confirmation-screen statement — the three beats (why the wait
 *   protects them · a small volunteer team · thanks for their patience) land
 *   hardest right after they've handed over their work.
 *
 * Presentational and dependency-free, so it drops into both server pages and the
 * `'use client'` intake forms.
 */
export function ReviewNotice({
  copy,
  variant = 'full',
  className,
}: {
  copy: ReviewNoticeSettings
  variant?: 'full' | 'compact'
  className?: string
}) {
  if (variant === 'compact') {
    return (
      <p className={cn('text-muted-foreground max-w-prose text-xs', className)}>
        {copy.short}
      </p>
    )
  }

  return (
    <div className={cn('border-primary/40 border-l-2 py-2 pl-4', className)}>
      <p className="text-primary text-xs font-black tracking-widest uppercase">
        {copy.title}
      </p>
      <p className="text-foreground mt-1 max-w-prose text-sm">{copy.body}</p>
    </div>
  )
}

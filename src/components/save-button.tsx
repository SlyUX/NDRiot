'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { Bookmark } from 'lucide-react'

import { toggleSaveAction } from '@/app/actions/saves'
import type { SavedItemType } from '@/sanity/reader-client'
import { cn } from '@/lib/utils'

/**
 * Save/bookmark toggle for a comic or maker — the reader's one explicit signal
 * (AGENTS.md §3). Optimistic: the fill flips on click and reconciles with the
 * server. A signed-out tap routes through the server action into Google sign-in
 * and back to this page, so nothing is lost.
 *
 * Labels come from Sanity (§2); the icon is decorative, the label is the name.
 */
export function SaveButton({
  itemType,
  itemId,
  initialSaved,
  saveLabel,
  savedLabel,
  className,
}: {
  itemType: SavedItemType
  itemId: string
  initialSaved: boolean
  saveLabel: string
  savedLabel: string
  className?: string
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()
  const pathname = usePathname()

  function onClick() {
    const next = !saved
    setSaved(next) // optimistic
    startTransition(async () => {
      const result = await toggleSaveAction(itemType, itemId, pathname)
      // A signed-out toggle redirects to sign-in (this line is unreachable then);
      // an error reverts; otherwise reconcile with the server's truth.
      setSaved(result.error ? !next : result.saved)
    })
  }

  const label = saved ? savedLabel : saveLabel
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        'focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
        saved ? 'border-primary text-primary' : 'text-foreground hover:border-primary/60 border-white/20',
        className,
      )}
    >
      <Bookmark aria-hidden="true" strokeWidth={2.5} className={cn('size-4', saved && 'fill-current')} />
      {label}
    </button>
  )
}

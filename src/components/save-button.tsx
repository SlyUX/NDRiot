'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { Bookmark } from 'lucide-react'

import { toggleSaveAction } from '@/app/actions/saves'
import { SignInDialog } from '@/components/sign-in-dialog'
import type { SavedItemType } from '@/sanity/reader-client'
import { cn } from '@/lib/utils'

/**
 * Save/bookmark toggle for a comic or maker — the reader's one explicit signal
 * (AGENTS.md §3). White button, black text (21:1) — deliberately neutral, not
 * the funding green, so it never reads as "campaign." Optimistic: the bookmark
 * fills on click and reconciles with the server. Signed out, it opens the
 * sign-in modal instead of acting. Labels come from Sanity (§2).
 */
export function SaveButton({
  itemType,
  itemId,
  initialSaved,
  signedIn,
  saveLabel,
  savedLabel,
  signInCopy,
  variant = 'solid',
  className,
}: {
  itemType: SavedItemType
  itemId: string
  initialSaved: boolean
  signedIn: boolean
  saveLabel: string
  savedLabel: string
  signInCopy: { title: string; body: string; cta: string }
  /**
   * `solid` — filled white on black (21:1), the default on detail pages.
   * `outline` — white border + white text on a transparent fill, for sitting
   * over the busy hero image where the pink "read it" CTA is the primary.
   */
  variant?: 'solid' | 'outline'
  className?: string
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [gateOpen, setGateOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const pathname = usePathname()

  function onClick() {
    if (!signedIn) {
      setGateOpen(true)
      return
    }
    const next = !saved
    setSaved(next) // optimistic
    startTransition(async () => {
      const result = await toggleSaveAction(itemType, itemId, pathname)
      setSaved(result.error ? !next : result.saved)
    })
  }

  const label = saved ? savedLabel : saveLabel
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          'focus-visible:ring-ring inline-flex items-center gap-1.5 border border-white px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
          variant === 'outline'
            ? 'bg-transparent text-white hover:bg-white/10'
            : 'bg-white text-black hover:bg-white/85',
          className,
        )}
      >
        <Bookmark aria-hidden="true" strokeWidth={2.5} className={cn('size-4', saved && 'fill-current')} />
        {label}
      </button>
      {!signedIn && (
        <SignInDialog
          open={gateOpen}
          onOpenChange={setGateOpen}
          title={signInCopy.title}
          body={signInCopy.body}
          cta={signInCopy.cta}
        />
      )}
    </>
  )
}

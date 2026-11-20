'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'

import { toggleSaveAction } from '@/app/actions/saves'
import { FlamingHeart } from '@/components/flaming-heart'
import { SignInDialog } from '@/components/sign-in-dialog'
import type { SavedItemType } from '@/sanity/reader-client'
import { cn } from '@/lib/utils'

/**
 * Fave toggle — the reader's one explicit signal (AGENTS.md §3). One mark for
 * every type: a flaming heart, outline → filled on fave (creators, comics, and
 * strips alike — faving is faving). White button, black text (21:1) —
 * deliberately neutral, not the funding green, so it never reads as "campaign."
 * Optimistic: the icon changes on click and reconciles with the server. Signed
 * out, it opens the sign-in modal instead of acting. Labels come from Sanity (§2).
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
  collapseLabelWhenSaved = false,
  onSavedChange,
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
   * `icon` — compact bookmark-only chip for a listing card's cover corner; the
   * label rides along as the accessible name (aria-label) rather than visible text.
   */
  variant?: 'solid' | 'outline' | 'icon'
  /** On the profile action row: once followed, collapse to the glyph only
   *  (label stays as the accessible name). Keeps the row tidy next to Chat Request. */
  collapseLabelWhenSaved?: boolean
  /** Called after a successful toggle — lets a parent offer "message them?" on follow. */
  onSavedChange?: (saved: boolean) => void
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
      const nextSaved = result.error ? !next : result.saved
      setSaved(nextSaved)
      onSavedChange?.(nextSaved)
    })
  }

  const label = saved ? savedLabel : saveLabel
  const icon = variant === 'icon'
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={cn(
          'focus-visible:ring-ring inline-flex items-center transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
          icon
            ? cn(
                // A cover-corner chip: dark scrim so the bookmark reads over any
                // art; fills pink when saved.
                'bg-black/70 p-1.5 text-white hover:text-primary',
                saved && 'text-primary',
              )
            : cn(
                'gap-1.5 border border-white px-3 py-2 text-xs font-bold tracking-widest uppercase',
                variant === 'outline'
                  ? 'bg-transparent text-white hover:bg-white/10'
                  : 'bg-white text-black hover:bg-white/85',
              ),
          className,
        )}
      >
        {/* The heart turns --primary (pink) once faved; idle it inherits the
            button's text color (white on dark variants, black on the solid). */}
        <FlamingHeart className={cn('size-4', saved && 'text-primary')} />
        {!icon && !(collapseLabelWhenSaved && saved) && label}
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

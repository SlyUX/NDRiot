'use client'

import { useState, useSyncExternalStore } from 'react'
import { Check, Copy, Mail, Share2 } from 'lucide-react'

import { SocialIcon } from '@/components/social-icon'
import { cn } from '@/lib/utils'

/**
 * Share this page. A per-page affordance — the reader sends *this* comic, maker,
 * or article out to their own network.
 *
 * The native share sheet (Web Share API) is offered when the device has one —
 * mostly phones — and it's the best path there. The explicit buttons are the
 * always-present fallback for everywhere else. No X: a deliberate omission.
 * Instagram is absent too, but for a plain reason — it has no web share-to URL.
 *
 * `url` is pre-resolved to an absolute URL by the page (via absoluteUrl), so
 * this stays presentational and never has to know the origin.
 */

export interface ShareBarProps {
  /** The page's title — the shared headline. */
  title: string
  /** Absolute URL of the page. */
  url: string
  /** Section label, e.g. "Share". CMS copy. */
  label: string
  /** Confirmation shown after copying, e.g. "Link copied". CMS copy. */
  copiedLabel: string
  className?: string
}

export function ShareBar({ title, url, label, copiedLabel, className }: ShareBarProps) {
  const [copied, setCopied] = useState(false)

  // Feature-detect the native share sheet from an external system (the browser)
  // rather than a setState-in-effect: the server snapshot is false, the client
  // reads the real capability, and useSyncExternalStore keeps the two from
  // tearing. navigator.share is absent during SSR and on most desktops.
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  )

  const enc = encodeURIComponent
  const titleAndUrl = `${title} ${url}`
  const brandTargets = [
    { platform: 'Bluesky', href: `https://bsky.app/intent/compose?text=${enc(titleAndUrl)}` },
    { platform: 'Threads', href: `https://www.threads.net/intent/post?text=${enc(titleAndUrl)}` },
    { platform: 'Reddit', href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}` },
  ]

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (insecure context, denied permission) — leave the
      // other buttons to do the job rather than surfacing an error.
    }
  }

  const onNativeShare = async () => {
    try {
      await navigator.share({ title, url })
    } catch {
      // AbortError when the user dismisses the sheet, or unsupported — ignore.
    }
  }

  const itemClass =
    'text-muted-foreground hover:text-primary focus-visible:ring-ring flex size-9 items-center justify-center border border-white/15 transition-colors focus-visible:ring-2 focus-visible:outline-none'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* aria-hidden: every control below carries its own label, so the heading
          is decoration for sighted readers, not a thing to announce twice. */}
      <span aria-hidden="true" className="text-muted-foreground text-xs tracking-widest uppercase">
        {label}
      </span>

      {canNativeShare && (
        <button type="button" onClick={onNativeShare} aria-label={label} title={label} className={itemClass}>
          <Share2 className="size-4" />
        </button>
      )}

      {brandTargets.map((t) => (
        <a
          key={t.platform}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} on ${t.platform}`}
          title={`${label} on ${t.platform}`}
          className={itemClass}
        >
          <SocialIcon platform={t.platform} className="size-4" />
        </a>
      ))}

      <a
        href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}
        aria-label={`${label} by email`}
        title={`${label} by email`}
        className={itemClass}
      >
        <Mail className="size-4" />
      </a>

      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? copiedLabel : 'Copy link'}
        title={copied ? copiedLabel : 'Copy link'}
        className={itemClass}
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      </button>

      {/* Announces the copy to assistive tech, since nothing else on screen
          changes enough to notice. */}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </div>
  )
}

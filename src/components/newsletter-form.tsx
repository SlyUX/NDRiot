'use client'

import { useActionState, useEffect, useRef } from 'react'

import { subscribeNewsletter, type NewsletterState } from '@/app/actions/newsletter'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NewsletterSettings } from '@/lib/site-settings'

/**
 * Newsletter signup. Native form + server action (→ MailerLite), styled to ND
 * Riot rather than a third-party embed. Two looks from one component:
 *   - `band`   — the pink section under the hero (black text on pink, §9).
 *   - `compact`— the small footer form (light text on the near-black surface).
 */

const INITIAL: NewsletterState = { status: 'idle' }

export function NewsletterForm({
  copy,
  variant,
  className,
}: {
  copy: NewsletterSettings
  variant: 'band' | 'compact'
  className?: string
}) {
  const [state, action, pending] = useActionState(subscribeNewsletter, INITIAL)
  const onPink = variant === 'band'
  const errorId = `nl-error-${variant}`
  const consentId = `nl-consent-${variant}`

  // Stamp render time for the timing gate (a submit faster than a human is a bot).
  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  // On success the form is replaced by the confirmation; move focus to it so a
  // keyboard/screen-reader user lands on the message instead of dropping to body.
  const successRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (state.status === 'success') successRef.current?.focus()
  }, [state.status])

  if (state.status === 'success') {
    return (
      <p
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={cn(
          'text-sm font-bold focus-visible:outline-none',
          onPink ? 'text-black' : 'text-foreground',
          className,
        )}
      >
        {copy.successMessage}
      </p>
    )
  }

  // The field is described by the consent line always, and the error when present.
  const describedBy = [state.status === 'error' ? errorId : null, consentId]
    .filter(Boolean)
    .join(' ')

  return (
    <form action={action} className={cn('w-full', className)} noValidate>
      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`nl-company-${variant}`}>Company</label>
        <input id={`nl-company-${variant}`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={timingRef} type="hidden" name="t" />

      <div className={cn('flex gap-2', variant === 'compact' && 'max-w-xs')}>
        <input
          type="email"
          name="email"
          required
          defaultValue={state.email ?? ''}
          placeholder={copy.placeholder}
          aria-label="Email address"
          aria-invalid={state.status === 'error'}
          aria-describedby={describedBy}
          className={cn(
            'focus-visible:ring-ring w-full border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none',
            onPink
              ? 'border-black/40 bg-white/15 text-black placeholder:text-black/60'
              : 'border-white/20 bg-transparent placeholder:text-muted-foreground text-foreground',
          )}
        />
        <Button
          type="submit"
          disabled={pending}
          size={onPink ? 'lg' : 'default'}
          className={cn(
            'shrink-0 font-black tracking-wide uppercase',
            // Black button on the pink band; the site's pink button on the dark footer.
            onPink && 'border border-black bg-black text-white hover:bg-black/85',
          )}
        >
          {copy.buttonLabel}
        </Button>
      </div>

      {state.status === 'error' && (
        <p
          id={errorId}
          role="alert"
          className={cn('mt-2 text-xs font-bold', onPink ? 'text-black' : 'text-destructive')}
        >
          {state.message ?? copy.errorMessage}
        </p>
      )}

      <p id={consentId} className={cn('mt-2 text-xs', onPink ? 'text-black/70' : 'text-muted-foreground')}>
        {copy.consent}
      </p>
    </form>
  )
}

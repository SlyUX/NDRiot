'use client'

import { useActionState, useEffect, useRef } from 'react'

import { submitContact, type ContactState } from '@/app/actions/contact'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ContactSettings } from '@/lib/site-settings'

/**
 * The contact form. Presentational — every label is passed in from Sanity
 * (AGENTS.md §2), and the sending lives in the `submitContact` Server Action.
 *
 * Built on a plain <form action={…}> so it submits without JavaScript:
 * useActionState upgrades it with a pending state and inline errors once
 * hydrated, but the server path is identical either way.
 */

const INITIAL: ContactState = { status: 'idle' }

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none aria-[invalid=true]:border-destructive'

export function ContactForm({ copy }: { copy: ContactSettings }) {
  const [state, action, pending] = useActionState(submitContact, INITIAL)

  // Mount time, written straight to the hidden input's DOM value after
  // hydration. A ref rather than state on purpose: this feeds the form at
  // submit, nothing renders from it, and writing the DOM in an effect avoids
  // the cascading-render that setState-in-effect would cause. The action
  // rejects a submission that beats a plausible typing time. Left empty
  // without JS — the gate then does not apply, but the honeypot still does.
  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  if (state.status === 'success') {
    return (
      <p
        role="status"
        className="border-primary text-foreground border-l-2 py-2 pl-4 text-sm"
      >
        {copy.successMessage}
      </p>
    )
  }

  const errors = state.fieldErrors ?? {}
  const values = state.values

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* Honeypot: off-screen and untabbable, invisible to people, tempting to
          bots. aria-hidden so it is never announced. A value here is dropped
          server-side. Not display:none — some bots skip those. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={timingRef} type="hidden" name="t" />

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-xs tracking-widest uppercase">
          {copy.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          defaultValue={values?.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={fieldClass}
        />
        {errors.name && (
          <p id="name-error" className="text-destructive text-xs">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs tracking-widest uppercase">
          {copy.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={values?.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={fieldClass}
        />
        {errors.email && (
          <p id="email-error" className="text-destructive text-xs">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="subject" className="block text-xs tracking-widest uppercase">
          {copy.subjectLabel}
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={150}
          defaultValue={values?.subject}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="block text-xs tracking-widest uppercase">
          {copy.messageLabel}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={5000}
          defaultValue={values?.message}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={cn(fieldClass, 'resize-y')}
        />
        {errors.message && (
          <p id="message-error" className="text-destructive text-xs">
            {errors.message}
          </p>
        )}
      </div>

      {/* A send-level failure (not a field problem) that the sender can retry.
          aria-live so it is announced when it appears. */}
      {state.status === 'error' && !state.fieldErrors && (
        <p role="alert" className="text-destructive text-sm">
          {state.message ?? copy.errorMessage}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="font-black tracking-wide uppercase"
      >
        {copy.submitLabel}
      </Button>
    </form>
  )
}

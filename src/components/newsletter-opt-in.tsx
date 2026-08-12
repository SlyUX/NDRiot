'use client'

import { useState, useTransition } from 'react'

import { optInNewsletterAction } from '@/app/actions/saves'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'

/**
 * The reader's monthly-email opt-in on /me.
 *
 * Deliberately stateless: it never claims a subscription status, because
 * MailerLite (double opt-in + unsubscribe) owns that lifecycle and a local copy
 * would drift. Clicking subscribes and shows a transient "check your inbox";
 * reload returns to the invite. A distinct shape from the public NewsletterForm
 * (no email field — identity is the session). Every string comes from Sanity
 * (§2). Uses a click-driven action like SaveButton, matching /me's other
 * interactive controls.
 */
export function NewsletterOptIn({
  heading,
  body,
  cta,
  successLabel,
  errorLabel,
}: {
  heading: string
  body: string
  cta: string
  successLabel: string
  errorLabel: string
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<'ok' | 'error' | null>(null)

  const onClick = () =>
    startTransition(async () => {
      setResult((await optInNewsletterAction()) ? 'ok' : 'error')
    })

  return (
    <div>
      <SectionHeading as="h2" size="sm">
        {heading}
      </SectionHeading>
      {result === 'ok' ? (
        <p role="status" className="text-muted-foreground max-w-prose text-sm">
          {successLabel}
        </p>
      ) : (
        <div className="max-w-prose space-y-3">
          <p className="text-muted-foreground text-sm">{body}</p>
          <Button
            type="button"
            size="sm"
            onClick={onClick}
            disabled={pending}
            className="font-black tracking-wide uppercase"
          >
            {cta}
          </Button>
          {result === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              {errorLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

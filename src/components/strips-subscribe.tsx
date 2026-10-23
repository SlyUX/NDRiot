'use client'

import { useState, useTransition } from 'react'
import { Bell, BellRing } from 'lucide-react'

import { setStripSubscriptionAction } from '@/app/actions/notifications'
import { Button } from '@/components/ui/button'

/**
 * "Notify me about new strips" — the only subscription that follows a content
 * TYPE rather than a specific creator/comic, so it lives here where strips are
 * browsed. Still explicit and user-directed (§3): the reader opts in, and a
 * single notification fires when new strips appear (not one per strip).
 *
 * Click-driven like the other /me controls (NewsletterOptIn, SaveButton).
 * Identity is the session, resolved server-side in the action. Every string is
 * CMS copy (§2).
 */
export function StripsSubscribe({
  initialSubscribed,
  subscribeLabel,
  subscribedLabel,
}: {
  initialSubscribed: boolean
  subscribeLabel: string
  subscribedLabel: string
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [pending, startTransition] = useTransition()

  const onClick = () =>
    startTransition(async () => {
      const res = await setStripSubscriptionAction(!subscribed)
      if (res.ok) setSubscribed(res.subscribed)
    })

  const Icon = subscribed ? BellRing : Bell
  return (
    <Button
      type="button"
      size="sm"
      variant={subscribed ? 'default' : 'outline'}
      onClick={onClick}
      disabled={pending}
      aria-pressed={subscribed}
      className="font-black tracking-wide uppercase"
    >
      <Icon aria-hidden="true" className="size-4" />
      {subscribed ? subscribedLabel : subscribeLabel}
    </Button>
  )
}

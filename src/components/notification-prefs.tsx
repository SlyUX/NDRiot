'use client'

import { useState, useTransition } from 'react'
import { Mail, MailX } from 'lucide-react'

import { setEmailPrefAction } from '@/app/actions/notifications'
import { Button } from '@/components/ui/button'

type PrefKey = 'emailMessages' | 'emailCollab'

/**
 * Creator notification preferences on /me (Settings). Opt-out email toggles —
 * the in-app badge is always on; these only control the emails. Click-driven
 * like the other /me controls; identity resolved server-side. Copy from Sanity.
 */
export function NotificationPrefs({
  onLabel,
  offLabel,
  items,
}: {
  onLabel: string
  offLabel: string
  items: { key: PrefKey; label: string; initial: boolean }[]
}) {
  return (
    <ul className="mt-3">
      {items.map((item) => (
        <PrefRow key={item.key} item={item} onLabel={onLabel} offLabel={offLabel} />
      ))}
    </ul>
  )
}

function PrefRow({
  item,
  onLabel,
  offLabel,
}: {
  item: { key: PrefKey; label: string; initial: boolean }
  onLabel: string
  offLabel: string
}) {
  const [on, setOn] = useState(item.initial)
  const [pending, startTransition] = useTransition()

  const toggle = () =>
    startTransition(async () => {
      const res = await setEmailPrefAction(item.key, !on)
      if (res.ok) setOn(res.value)
    })

  const Icon = on ? Mail : MailX
  return (
    <li className="border-border flex items-center justify-between gap-4 border-b py-3">
      <span className="text-sm">{item.label}</span>
      <Button
        type="button"
        size="sm"
        variant={on ? 'default' : 'outline'}
        onClick={toggle}
        disabled={pending}
        aria-pressed={on}
        className="font-black tracking-wide uppercase"
      >
        <Icon aria-hidden="true" className="size-4" />
        {on ? onLabel : offLabel}
      </Button>
    </li>
  )
}

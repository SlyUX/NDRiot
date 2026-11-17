'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserCheck, UserPlus } from 'lucide-react'

import { respondMessage } from '@/app/actions/messages'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/card-mappers'
import type { MessagingSettings } from '@/lib/site-settings'
import type { FollowSignal } from '@/sanity/cosign-client'

export type IncomingMessageRequest = {
  fromId: string
  name: string
  slug: string | null
  note: string | null
  createdAt: string | null
  /** PRIVATE to the recipient — "follows you" / mutual (Cosign) / nothing. */
  signal: FollowSignal
}

/**
 * Incoming message requests on /me — accept to open a conversation, or decline.
 * Always a deliberate choice (no auto-accept). The requester's note is a
 * micro-dose of who they are; the follow signal is private context shown only
 * here, to the recipient (AGENTS §3 — one-way follows never go public).
 */
export function MessageRequests({
  incoming,
  copy,
}: {
  incoming: IncomingMessageRequest[]
  copy: MessagingSettings
}) {
  return (
    <section>
      <h3 className="text-xl font-black tracking-tight uppercase">
        {copy.incomingHeading}
      </h3>
      <p className="text-muted-foreground mt-1.5 max-w-prose text-sm">
        {copy.incomingIntro}
      </p>

      {incoming.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">{copy.incomingEmpty}</p>
      ) : (
        <ul className="mt-4">
          {incoming.map((item) => (
            <RequestRow key={item.fromId} item={item} copy={copy} />
          ))}
        </ul>
      )}
    </section>
  )
}

function SignalBadge({ signal, copy }: { signal: FollowSignal; copy: MessagingSettings }) {
  if (signal === 'none') return null
  const mutual = signal === 'mutual'
  const Icon = mutual ? UserCheck : UserPlus
  return (
    <span className="bg-card text-primary inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
      <Icon aria-hidden="true" className="size-3" />
      {mutual ? copy.mutualLabel : copy.followsYouLabel}
    </span>
  )
}

function RequestRow({
  item,
  copy,
}: {
  item: IncomingMessageRequest
  copy: MessagingSettings
}) {
  const [pending, startTransition] = useTransition()
  const [which, setWhich] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function respond(accept: boolean) {
    setError(null)
    setWhich(accept ? 'accept' : 'decline')
    startTransition(async () => {
      const result = await respondMessage({ fromId: item.fromId, accept })
      if (result.ok) router.refresh()
      else {
        setError(result.error ?? 'Something went wrong.')
        setWhich(null)
      }
    })
  }

  const name = item.slug ? (
    <Link
      href={`/creators/${item.slug}`}
      className="hover:text-primary font-bold transition-colors"
    >
      {item.name}
    </Link>
  ) : (
    <span className="font-bold">{item.name}</span>
  )

  return (
    <li className="border-border border-b py-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>
          {name}{' '}
          <span className="text-muted-foreground">{copy.incomingVerb}</span>
        </span>
        <SignalBadge signal={item.signal} copy={copy} />
      </div>

      {item.note && <p className="mt-2 max-w-prose text-sm">{item.note}</p>}

      {item.createdAt && (
        <p className="text-muted-foreground mt-1 text-xs">
          {copy.requestedPrefix} {formatDate(item.createdAt)}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={pending}
          className="bg-primary text-primary-foreground border-primary focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          {pending && which === 'accept' && <Spinner className="size-3.5" />}
          {copy.acceptLabel}
        </button>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={pending}
          className="text-muted-foreground hover:border-primary/60 hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          {pending && which === 'decline' && <Spinner className="size-3.5" />}
          {copy.declineLabel}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </li>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { respondCollab } from '@/app/actions/collab'
import type { CollabSettings } from '@/lib/site-settings'
import { COLLAB_RESPONSES, type CollabResponseValue } from '@/lib/taxonomy'
import type { CollabStatus } from '@/sanity/collab-client'
import { cn } from '@/lib/utils'

export type IncomingCollab = {
  fromId: string
  name: string
  slug: string | null
  genre: string | null
  status: CollabStatus
  response: string | null
}
export type SentCollab = {
  name: string
  slug: string | null
  genre: string | null
  status: CollabStatus
  response: string | null
}

/**
 * The creator's collaboration requests on /me — incoming (respond with a canned
 * preset) and sent (their status). No free text: responding is one of three
 * fixed presets; only "yes" opens an email introduction (server-side).
 */
export function CollabRequests({
  incoming,
  sent,
  copy,
}: {
  incoming: IncomingCollab[]
  sent: SentCollab[]
  copy: CollabSettings
}) {
  const responseLabel = (v: CollabResponseValue) =>
    v === 'accepted'
      ? copy.responseAcceptedLabel
      : v === 'maybe'
        ? copy.responseMaybeLabel
        : copy.responseDeclinedLabel

  const nameNode = (name: string, slug: string | null) =>
    slug ? (
      <Link
        href={`/creators/${slug}`}
        className="hover:text-primary font-bold transition-colors"
      >
        {name}
      </Link>
    ) : (
      <span className="font-bold">{name}</span>
    )

  return (
    <div className="space-y-10">
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
              <IncomingRow
                key={item.fromId}
                item={item}
                copy={copy}
                responseLabel={responseLabel}
                nameNode={nameNode(item.name, item.slug)}
              />
            ))}
          </ul>
        )}
      </section>

      {sent.length > 0 && (
        <section>
          <h3 className="text-xl font-black tracking-tight uppercase">
            {copy.sentHeading}
          </h3>
          <ul className="mt-4">
            {sent.map((item, i) => (
              <li
                key={i}
                className="border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-3 text-sm"
              >
                <span>
                  {nameNode(item.name, item.slug)}{' '}
                  <span className="text-muted-foreground">
                    · {copy.incomingVerb} {item.genre}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs tracking-wide uppercase">
                  {item.status === 'pending'
                    ? copy.sentPendingLabel
                    : `${copy.sentRespondedPrefix} ${item.response ?? ''}`.trim()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function IncomingRow({
  item,
  copy,
  responseLabel,
  nameNode,
}: {
  item: IncomingCollab
  copy: CollabSettings
  responseLabel: (v: CollabResponseValue) => string
  nameNode: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function respond(value: CollabResponseValue) {
    setError(null)
    startTransition(async () => {
      const result = await respondCollab({ fromId: item.fromId, response: value })
      if (result.ok) router.refresh()
      else setError(result.error ?? 'Something went wrong.')
    })
  }

  return (
    <li className="border-border border-b py-4">
      <p className="text-sm">
        {nameNode}{' '}
        <span className="text-muted-foreground">
          {copy.incomingVerb} {item.genre}
        </span>
      </p>

      {item.status === 'pending' || item.status === 'maybe' ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
            {/* A "maybe" is a deferred state they can still act on — say so. */}
            {item.status === 'maybe' ? copy.incomingMaybeNote : copy.respondPrompt}
          </span>
          {COLLAB_RESPONSES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => respond(o.value)}
              disabled={pending}
              className={cn(
                'focus-visible:ring-ring border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
                o.accepts
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:border-primary/60 hover:text-foreground border-white/20',
              )}
            >
              {responseLabel(o.value)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-1.5 text-xs tracking-wide uppercase">
          {item.response}
        </p>
      )}

      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </li>
  )
}

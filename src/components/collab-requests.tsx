'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

import { respondCollab } from '@/app/actions/collab'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/card-mappers'
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
  createdAt: string | null
}
export type SentCollab = {
  name: string
  slug: string | null
  genre: string | null
  status: CollabStatus
  response: string | null
  createdAt: string | null
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
  recentSince,
}: {
  incoming: IncomingCollab[]
  sent: SentCollab[]
  copy: CollabSettings
  /** ISO cutoff (server-computed) — requests older than this fold away. */
  recentSince: string
}) {
  const [showAll, setShowAll] = useState(false)

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

  // Accepted collaborations are chats now (shown above the requests), not rows.
  const incomingReq = incoming.filter((i) => i.status !== 'accepted')
  const sentReq = sent.filter((s) => s.status !== 'accepted')

  if (incomingReq.length === 0 && sentReq.length === 0) {
    return <p className="text-muted-foreground text-sm">{copy.incomingEmpty}</p>
  }

  const isRecent = (createdAt: string | null) =>
    Boolean(createdAt) && (createdAt as string) > recentSince

  const recentIncoming = incomingReq.filter((i) => isRecent(i.createdAt))
  const oldIncoming = incomingReq.filter((i) => !isRecent(i.createdAt))
  const recentSent = sentReq.filter((s) => isRecent(s.createdAt))
  const oldSent = sentReq.filter((s) => !isRecent(s.createdAt))
  const oldCount = oldIncoming.length + oldSent.length

  const incomingRow = (item: IncomingCollab) => (
    <IncomingRow
      key={item.fromId}
      item={item}
      copy={copy}
      responseLabel={responseLabel}
      nameNode={nameNode(item.name, item.slug)}
    />
  )

  const sentRow = (item: SentCollab, key: string) => (
    <li
      key={key}
      className="border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-3 text-sm"
    >
      <div>
        <span>
          {nameNode(item.name, item.slug)}{' '}
          <span className="text-muted-foreground">
            · {copy.incomingVerb} {item.genre}
          </span>
        </span>
        {item.createdAt && (
          <span className="text-muted-foreground mt-0.5 block text-xs">
            {copy.requestedPrefix} {formatDate(item.createdAt)}
          </span>
        )}
      </div>
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {item.status === 'pending'
          ? copy.sentPendingLabel
          : `${copy.sentRespondedPrefix} ${item.response ?? ''}`.trim()}
      </span>
    </li>
  )

  // Last 7 days visible; older folds behind a plain text link + caret.
  return (
    <div>
      <ul>
        {recentIncoming.map(incomingRow)}
        {recentSent.map((item, i) => sentRow(item, `rs-${i}`))}
      </ul>
      {oldCount > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring mt-3 inline-flex items-center gap-1 text-xs font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', showAll && 'rotate-180')}
            />
            {copy.viewAllRequestsLabel}
          </button>
          {showAll && (
            <ul className="mt-2">
              {oldIncoming.map(incomingRow)}
              {oldSent.map((item, i) => sentRow(item, `os-${i}`))}
            </ul>
          )}
        </>
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
  const [which, setWhich] = useState<CollabResponseValue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function respond(value: CollabResponseValue) {
    setError(null)
    setWhich(value)
    startTransition(async () => {
      const result = await respondCollab({ fromId: item.fromId, response: value })
      if (result.ok) router.refresh()
      else {
        setError(result.error ?? 'Something went wrong.')
        setWhich(null)
      }
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
      {item.createdAt && (
        <p className="text-muted-foreground mt-1 text-xs">
          {copy.requestedPrefix} {formatDate(item.createdAt)}
        </p>
      )}

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
                'focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
                o.accepts
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:border-primary/60 hover:text-foreground border-white/20',
              )}
            >
              {pending && which === o.value && <Spinner className="size-3.5" />}
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

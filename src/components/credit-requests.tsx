'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { confirmCredit, declineCredit } from '@/app/actions/credits'
import { Spinner } from '@/components/ui/spinner'
import type { CollabSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'
import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'

export type CreditInboxItem = {
  _id: string
  title: string
  slug: string | null
  cover: SanityImage | null
  ownerName: string | null
  roles: string[] | null
}

/**
 * Comics someone credited you on, awaiting your confirmation. Confirm → the
 * credit shows on your profile; decline → it's removed from the comic. Optimistic:
 * a resolved row collapses immediately, then the server state is refreshed.
 */
export function CreditInbox({
  items,
  copy,
}: {
  items: CreditInboxItem[]
  copy: CollabSettings
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-black tracking-widest uppercase">{copy.creditsHeading}</h3>
        <p className="text-muted-foreground mt-1 text-xs">{copy.creditsIntro}</p>
      </div>
      <ul>
        {items.map((item) => (
          <CreditRow key={item._id} item={item} copy={copy} />
        ))}
      </ul>
    </div>
  )
}

function CreditRow({ item, copy }: { item: CreditInboxItem; copy: CollabSettings }) {
  const [pending, startTransition] = useTransition()
  const [which, setWhich] = useState<'confirm' | 'decline' | null>(null)
  const [resolved, setResolved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function act(mode: 'confirm' | 'decline') {
    setError(null)
    setWhich(mode)
    startTransition(async () => {
      const result = await (mode === 'confirm'
        ? confirmCredit(item._id)
        : declineCredit(item._id))
      if (result.ok) {
        setResolved(true)
        router.refresh()
      } else {
        setError(result.error ?? 'Something went wrong.')
        setWhich(null)
      }
    })
  }

  if (resolved) return null

  const roles = (item.roles ?? []).join(', ')
  const cover = item.cover
    ? urlFor(item.cover).width(112).height(168).fit('crop').url()
    : null

  return (
    <li className="border-border flex items-start gap-3 border-b py-4">
      {cover && (
        <Image
          src={cover}
          alt=""
          width={56}
          height={84}
          className="bg-muted shrink-0 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {item.slug ? (
            <Link
              href={`/comics/${item.slug}`}
              className="hover:text-primary font-bold transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <span className="font-bold">{item.title}</span>
          )}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {item.ownerName ? `${item.ownerName} · ` : ''}
          {copy.creditVerb} {roles}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => act('confirm')}
            disabled={pending}
            className="bg-primary text-primary-foreground border-primary focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {pending && which === 'confirm' && <Spinner className="size-3.5" />}
            {copy.creditConfirmLabel}
          </button>
          <button
            type="button"
            onClick={() => act('decline')}
            disabled={pending}
            className={cn(
              'text-muted-foreground hover:border-primary/60 hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
            )}
          >
            {pending && which === 'decline' && <Spinner className="size-3.5" />}
            {copy.creditDeclineLabel}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-destructive mt-2 text-sm">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}

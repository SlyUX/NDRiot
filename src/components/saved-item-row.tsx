'use client'

import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bookmark } from 'lucide-react'

import { removeSaveAction } from '@/app/actions/saves'
import { Button } from '@/components/ui/button'

/**
 * One row in the dashboard's saved lists — a compact feed-style entry with a
 * destructive Remove control. Removing is optimistic (the row hides at once),
 * then reconciled with a router refresh. The thumbnail is passed in as a slot
 * so the server page keeps using next/image.
 */
export function SavedItemRow({
  itemId,
  title,
  href,
  thumb,
  removeLabel,
}: {
  itemId: string
  title: string
  href: string | null
  thumb: ReactNode
  removeLabel: string
}) {
  const [removed, setRemoved] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (removed) return null

  function onRemove() {
    setRemoved(true) // optimistic
    startTransition(async () => {
      await removeSaveAction(itemId)
      router.refresh()
    })
  }

  return (
    <li className="border-border flex items-center gap-3 border-b py-3">
      {thumb}
      {href ? (
        <Link
          href={href}
          className="hover:text-primary min-w-0 flex-1 truncate text-sm font-bold transition-colors"
        >
          {title}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{title}</span>
      )}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRemove}
        disabled={pending}
        className="shrink-0"
      >
        <Bookmark aria-hidden="true" className="size-3.5 fill-current" />
        {removeLabel}
      </Button>
    </li>
  )
}

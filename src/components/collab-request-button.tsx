'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Handshake } from 'lucide-react'

import { requestCollab } from '@/app/actions/collab'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { CollabSettings } from '@/lib/site-settings'
import type { CollabStatus } from '@/sanity/collab-client'
import { cn } from '@/lib/utils'

/**
 * "Request to collaborate" on another creator's profile — shown only to a
 * signed-in creator viewing an open-to-collab profile that isn't their own
 * (the page decides whether to render it). One request per creator, ever, so
 * once sent this becomes a quiet status line, never the button again.
 *
 * No free text: the requester picks a genre from a fixed list; the recipient
 * later replies with a canned preset. The dialog spells out the one-request
 * gravity and the community / no-obligation framing before they commit.
 */
export function CollabRequestButton({
  toId,
  toName,
  genres,
  copy,
  status,
  response,
}: {
  toId: string
  toName: string
  genres: readonly string[]
  copy: CollabSettings
  /** An existing request's status, or null if none has been sent. */
  status: CollabStatus | null
  /** The recipient's canned reply, once they have responded. */
  response: string | null
}) {
  const [open, setOpen] = useState(false)
  const [genre, setGenre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // Already sent (one per creator, ever) → a quiet status, not the button.
  if (status) {
    const label =
      status === 'pending'
        ? copy.requestPendingLabel
        : `${copy.requestRespondedPrefix} ${response ?? ''}`.trim()
    return (
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </span>
    )
  }

  function submit() {
    if (!genre) {
      setError(copy.genrePlaceholder)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await requestCollab({ toId, genre })
      if (result.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  const paragraphs = copy.dialogBody
    .replace(/\{name\}/g, toName)
    .split(/\n\n+/)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border-primary/60 text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Handshake aria-hidden="true" className="size-4" />
          {copy.requestButtonLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-lg font-black tracking-tight uppercase">
          {copy.dialogTitle.replace(/\{name\}/g, toName)}
        </DialogTitle>

        <div className="text-muted-foreground mt-3 space-y-3 text-sm">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-5">
          <label
            htmlFor="collab-genre"
            className="mb-1.5 block text-xs tracking-widest uppercase"
          >
            {copy.genreLabel}
          </label>
          <select
            id="collab-genre"
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value)
              setError(null)
            }}
            className={cn(
              'focus-visible:ring-ring w-full border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none',
              genre ? 'border-primary text-foreground' : 'text-muted-foreground border-white/20',
            )}
          >
            <option value="" className="bg-background text-foreground">
              {copy.genrePlaceholder}
            </option>
            {genres.map((g) => (
              <option key={g} value={g} className="bg-background text-foreground">
                {g}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-primary text-primary-foreground focus-visible:ring-ring px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {copy.submitLabel}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {copy.cancelLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

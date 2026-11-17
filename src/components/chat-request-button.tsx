'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Handshake, MessageSquare } from 'lucide-react'

import { requestCollab } from '@/app/actions/collab'
import { requestMessage } from '@/app/actions/messages'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { CollabSettings, MessagingSettings } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

type ThreadStatus = 'pending' | 'active' | 'declined' | 'closed' | 'blocked'

/**
 * "Chat Request" on another creator's profile — the single doorway to both
 * messaging and collaboration (the two workflows stay separate underneath; only
 * the entry point is unified). Shown to a signed-in creator viewing another
 * creator's profile.
 *
 * A free-text note is the whole request — a micro-dose of the requester before
 * the recipient accepts or declines (always a deliberate choice; no auto-accept).
 * When the target is open to collaboration AND no collab request has been sent,
 * an hr-separated option hands off, in place, to the structured collab flow.
 *
 * Once a thread exists this is a quiet status, not the button: a pending request
 * shows "Request sent"; an active thread links to the conversation on /me;
 * declined/closed/blocked render nothing (the pair can't re-open — by design).
 */
export function ChatRequestButton({
  toId,
  toName,
  copy,
  collabCopy,
  genres,
  threadStatus,
  collabEligible,
  dashboardHref,
}: {
  toId: string
  toName: string
  copy: MessagingSettings
  collabCopy: CollabSettings
  genres: readonly string[]
  threadStatus: ThreadStatus | null
  /** Target is open to collaboration AND no collab request has been sent yet. */
  collabEligible: boolean
  /** Where an active conversation lives (the /me view). */
  dashboardHref: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'message' | 'collab'>('message')
  const [note, setNote] = useState('')
  const [genre, setGenre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // Keep the dialog open (showing the spinner) until the action AND the data
  // refresh both finish, then close — so there's no gap where the dialog has
  // closed but the profile hasn't caught up. (router.refresh() inside the
  // transition holds `pending` true until the new data renders.)
  const pendingCloseRef = useRef(false)
  useEffect(() => {
    if (!pending && pendingCloseRef.current) {
      pendingCloseRef.current = false
      setOpen(false)
    }
  }, [pending])

  // A thread already exists → a status, not the request button.
  if (threadStatus === 'active') {
    return (
      <a
        href={dashboardHref}
        className="border-primary/60 text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <MessageSquare aria-hidden="true" className="size-4" />
        {copy.activeLabel}
      </a>
    )
  }
  if (threadStatus === 'pending') {
    return (
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {copy.sentLabel}
      </span>
    )
  }
  if (threadStatus) return null // declined / closed / blocked — no re-request

  function submitMessage() {
    if (!note.trim()) {
      setError(copy.notePlaceholder)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await requestMessage({ toId, note })
      if (result.ok) {
        pendingCloseRef.current = true
        router.refresh()
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  function submitCollab() {
    if (!genre) {
      setError(collabCopy.genrePlaceholder)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await requestCollab({ toId, genre })
      if (result.ok) {
        pendingCloseRef.current = true
        router.refresh()
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  const bodyParagraphs = copy.dialogBody.replace(/\{name\}/g, toName).split(/\n\n+/)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setMode('message')
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="border-primary/60 text-primary hover:bg-primary/10 focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <MessageSquare aria-hidden="true" className="size-4" />
          {copy.requestButtonLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {mode === 'message' ? (
          <>
            <DialogTitle className="text-lg font-black tracking-tight uppercase">
              {copy.dialogTitle.replace(/\{name\}/g, toName)}
            </DialogTitle>
            <div className="text-muted-foreground mt-3 space-y-3 text-sm">
              {bodyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-5">
              <label
                htmlFor="chat-note"
                className="mb-1.5 block text-xs tracking-widest uppercase"
              >
                {copy.noteLabel}
              </label>
              <textarea
                id="chat-note"
                value={note}
                rows={4}
                onChange={(e) => {
                  setNote(e.target.value)
                  setError(null)
                }}
                placeholder={copy.notePlaceholder}
                className="focus-visible:ring-ring w-full resize-none border border-white/20 bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive mt-3 text-sm">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={submitMessage}
                disabled={pending}
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-2 px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
              >
                {pending && <Spinner />}
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

            {collabEligible && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-sm font-bold tracking-wide uppercase">
                  {copy.collabPromptHeading}
                </p>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {copy.collabPromptBody}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setMode('collab')
                  }}
                  className="text-primary hover:text-primary/80 focus-visible:ring-ring mt-3 inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Handshake aria-hidden="true" className="size-4" />
                  {copy.collabPromptCta}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogTitle className="text-lg font-black tracking-tight uppercase">
              {collabCopy.dialogTitle.replace(/\{name\}/g, toName)}
            </DialogTitle>
            <div className="text-muted-foreground mt-3 space-y-3 text-sm">
              {collabCopy.dialogBody
                .replace(/\{name\}/g, toName)
                .split(/\n\n+/)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>

            <div className="mt-5">
              <label
                htmlFor="chat-collab-genre"
                className="mb-1.5 block text-xs tracking-widest uppercase"
              >
                {collabCopy.genreLabel}
              </label>
              <select
                id="chat-collab-genre"
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
                  {collabCopy.genrePlaceholder}
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
                onClick={submitCollab}
                disabled={pending}
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-2 px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
              >
                {pending && <Spinner />}
                {collabCopy.submitLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setMode('message')
                }}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {copy.backLabel}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

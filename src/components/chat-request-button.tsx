'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'

import { requestMessage } from '@/app/actions/messages'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { MessagingSettings } from '@/lib/site-settings'

type ThreadStatus = 'pending' | 'active' | 'declined' | 'closed' | 'blocked'

/**
 * "Chat Request" on another creator's profile — the message doorway, shown to a
 * signed-in creator viewing another creator's profile. Collaboration is its own
 * first-class button now (CollabRequestButton), so this dialog is message-only.
 *
 * A free-text note is the whole request — a micro-dose of the requester before
 * the recipient accepts or declines (always a deliberate choice; no auto-accept).
 *
 * Once a thread exists this is a quiet status, not the button: a pending request
 * shows "Request sent"; an active thread links to the conversation on /me;
 * declined/closed/blocked render nothing (the pair can't re-open — by design).
 */
export function ChatRequestButton({
  toId,
  toName,
  copy,
  threadStatus,
  dashboardHref,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  toId: string
  toName: string
  copy: MessagingSettings
  threadStatus: ThreadStatus | null
  /** Where an active conversation lives (the /me view). */
  dashboardHref: string
  /** Optional controlled open — lets a parent (e.g. the follow nudge) open it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [note, setNote] = useState('')
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
  }, [pending, setOpen])

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

  const bodyParagraphs = copy.dialogBody.replace(/\{name\}/g, toName).split(/\n\n+/)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
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
      {/* Don't auto-focus the note on open: on phones that pops the keyboard
          immediately and buries Send/Cancel. The viewer taps the field when
          ready. */}
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
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
      </DialogContent>
    </Dialog>
  )
}

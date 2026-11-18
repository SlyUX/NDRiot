'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell, BellOff, Flag, LogOut, Send, ShieldX } from 'lucide-react'

import {
  blockMessage,
  fetchThreadMessages,
  markRead,
  optOutMessage,
  reportMessage,
  sendMessage,
  toggleMute,
} from '@/app/actions/messages'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RequestRow,
  type IncomingMessageRequest,
} from '@/components/message-requests'
import { AvatarCircle } from '@/components/ui/avatar-circle'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/card-mappers'
import type { MessagingSettings } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

export type ConversationMessage = {
  key: string
  fromId: string
  body: string
  createdAt: string | null
}
export type Conversation = {
  threadDocId: string
  otherName: string
  otherSlug: string | null
  otherAvatarUrl: string | null
  /** The last message's body, for the row preview. */
  preview: string | null
  /** Optional context line for a collab chat, e.g. "Collaborating on Sci-Fi". */
  contextLabel: string | null
  messages: ConversationMessage[]
  lastMessageAt: string | null
  /** The other person has posted since this creator last read the thread. */
  unread: boolean
  /** This creator has muted the thread (stays active, drops from the badge). */
  muted: boolean
}
export type AwaitingRow = {
  name: string
  slug: string | null
  createdAt: string | null
}

/**
 * The creator's conversations on /me. A row opens the thread as a responsive
 * modal — full-screen on phones (so the keyboard can't shove the layout around),
 * a centered panel on desktop — which keeps switching and leaving a chat from
 * reflowing the list behind it. Sent requests still awaiting a reply show as
 * quiet "awaiting" rows. Near-real-time by polling while the modal is open (fine
 * at beta scale).
 */
export function MessageThreads({
  incoming,
  conversations,
  awaiting,
  meId,
  copy,
  heading,
}: {
  /** Incoming message requests — shown as rows at the top of the list. */
  incoming: IncomingMessageRequest[]
  conversations: Conversation[]
  awaiting: AwaitingRow[]
  meId: string
  copy: MessagingSettings
  /** Optional section heading; omitted when a tab already labels the panel. */
  heading?: string
}) {
  // `open` drives the modal; `active` holds the conversation and is kept through
  // the close animation (Radix needs the content mounted while it animates out).
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Conversation | null>(null)
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set())

  return (
    <section>
      {heading && (
        <h3 className="text-xl font-black tracking-tight uppercase">{heading}</h3>
      )}

      {incoming.length === 0 &&
      conversations.length === 0 &&
      awaiting.length === 0 ? (
        <p className="text-muted-foreground text-sm">{copy.threadsEmpty}</p>
      ) : (
        <ul className={heading ? 'mt-4' : ''}>
          {incoming.map((item) => (
            <RequestRow key={item.fromId} item={item} copy={copy} />
          ))}
          {conversations.map((c) => {
            const showUnread = c.unread && !locallyRead.has(c.threadDocId)
            return (
              <li key={c.threadDocId} className="border-border border-b">
                <button
                  type="button"
                  onClick={() => {
                    setActive(c)
                    setOpen(true)
                    if (showUnread) {
                      setLocallyRead((s) => new Set(s).add(c.threadDocId))
                      void markRead({ threadDocId: c.threadDocId })
                    }
                  }}
                  aria-haspopup="dialog"
                  aria-label={showUnread ? `${c.otherName}, unread` : undefined}
                  className="hover:text-primary flex w-full items-center gap-3 py-3 text-left transition-colors"
                >
                  <AvatarCircle
                    src={c.otherAvatarUrl}
                    name={c.otherName}
                    className="size-9"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {showUnread && (
                        <span
                          aria-hidden="true"
                          className="bg-primary inline-block size-2 shrink-0"
                        />
                      )}
                      <span className="truncate">{c.otherName}</span>
                      {c.muted && (
                        <BellOff
                          aria-label={copy.mutedLabel}
                          className="text-muted-foreground size-3 shrink-0"
                        />
                      )}
                    </span>
                    {(c.preview ?? c.contextLabel) && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {c.preview ?? c.contextLabel}
                      </span>
                    )}
                  </span>
                  {c.lastMessageAt && (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDate(c.lastMessageAt)}
                    </span>
                  )}
                </button>
              </li>
            )
          })}

          {awaiting.map((a, i) => (
            <li
              key={`await-${i}`}
              className="border-border flex items-center justify-between gap-3 border-b py-3 text-sm"
            >
              <span>
                {a.slug ? (
                  <Link
                    href={`/creators/${a.slug}`}
                    className="hover:text-primary font-bold transition-colors"
                  >
                    {a.name}
                  </Link>
                ) : (
                  <span className="font-bold">{a.name}</span>
                )}
              </span>
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                {copy.awaitingReplyLabel}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false)
        }}
      >
        <DialogContent variant="sheet" className="gap-0" data-chat-sheet="">
          {active && (
            <ConversationPanel
              key={active.threadDocId}
              conversation={active}
              meId={meId}
              copy={copy}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ConversationPanel({
  conversation,
  meId,
  copy,
  onClose,
}: {
  conversation: Conversation
  meId: string
  copy: MessagingSettings
  onClose: () => void
}) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [messages, setMessages] = useState(conversation.messages)
  // Optimistic sends: shown as reduced-opacity bubbles until the server confirms.
  // On failure the bubble is removed and its text is returned to the composer.
  const [outbox, setOutbox] = useState<{ key: string; body: string }[]>([])
  const [muted, setMutedState] = useState(conversation.muted)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const lastKeyRef = useRef<string | null>(
    conversation.messages[conversation.messages.length - 1]?.key ?? null,
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch the latest messages and apply them only when a NEW one has arrived, so
  // an idle poll never re-renders the composer. After mount the poll owns this
  // state (no props→state mirroring); `send` calls it for an immediate update.
  // Dropping the matching optimistic bubble happens in the SAME commit as the
  // real message lands — so the "sending" and sent copies never show together
  // (one-frame overlap otherwise), whichever path (send or poll) brings it in.
  // (Rare edge: two identical messages sent back-to-back may briefly show one
  // bubble until the next poll; it self-corrects.)
  const refresh = useCallback(async () => {
    const res = await fetchThreadMessages({ threadDocId: conversation.threadDocId })
    if (!res) return
    const last = res.messages[res.messages.length - 1]
    if (last && last.key !== lastKeyRef.current) {
      lastKeyRef.current = last.key
      const serverMine = new Set(
        res.messages.filter((m) => m.fromId === meId).map((m) => m.body),
      )
      setMessages(res.messages)
      setOutbox((o) => o.filter((m) => !serverMine.has(m.body)))
      if (last.fromId !== meId) void markRead({ threadDocId: conversation.threadDocId })
    }
  }, [conversation.threadDocId, meId])

  // Poll while the conversation is open — near-real-time without a chat server.
  // Pauses when the tab is hidden.
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden')
        return
      void refresh()
    }, 2500)
    return () => clearInterval(id)
  }, [refresh])

  const pinToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // Keep the pane pinned to the latest message (on open, each new one, and each
  // optimistic send).
  useEffect(() => {
    pinToBottom()
  }, [messages, outbox.length, pinToBottom])

  // Keyboard-safe sheet on mobile. The full-screen sheet is `fixed inset-0`,
  // which tracks the LAYOUT viewport — and iOS doesn't shrink that when the
  // keyboard opens, so the composer ends up behind it. Pin the sheet to the
  // VISUAL viewport instead (height + offset), so the composer rides just above
  // the keyboard. Desktop keeps its centered CSS sizing (styles cleared there).
  useEffect(() => {
    const vv = window.visualViewport
    const sheet = document.querySelector<HTMLElement>('[data-chat-sheet]')
    if (!vv || !sheet) return
    const desktop = window.matchMedia('(min-width: 640px)')

    const apply = () => {
      if (desktop.matches) {
        sheet.style.height = ''
        sheet.style.top = ''
        sheet.style.bottom = ''
        return
      }
      sheet.style.height = `${vv.height}px`
      sheet.style.top = `${vv.offsetTop}px`
      sheet.style.bottom = 'auto'
      // Defer the pin to the next frame: the sheet just resized, and scrolling in
      // the same tick pins against the PRE-resize height, which leaves the last
      // message hidden under the keyboard. rAF lets layout settle first.
      requestAnimationFrame(pinToBottom)
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    desktop.addEventListener('change', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      desktop.removeEventListener('change', apply)
      sheet.style.height = ''
      sheet.style.top = ''
      sheet.style.bottom = ''
    }
  }, [pinToBottom])

  // Report snapshots the other person's most recent message, when there is one.
  const lastOtherKey =
    [...messages].reverse().find((m) => m.fromId !== meId)?.key ?? ''

  function send() {
    const text = body.trim()
    if (!text) return
    setError(null)
    const key = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setOutbox((o) => [...o, { key, body: text }])
    setBody('')
    startTransition(async () => {
      const result = await sendMessage({ threadDocId: conversation.threadDocId, body: text })
      if (result.ok) {
        // refresh() swaps the real message in and drops this bubble in one commit.
        await refresh()
      } else {
        setOutbox((o) => o.filter((m) => m.key !== key))
        // Hand the text back so it can be edited and resent; keep anything the
        // user has already started typing since.
        setBody((b) => (b.trim() ? b : text))
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  function leave() {
    if (!window.confirm(copy.leaveConfirm)) return
    startTransition(async () => {
      const result = await optOutMessage({ threadDocId: conversation.threadDocId })
      if (result.ok) {
        onClose()
        router.refresh()
      } else setError(result.error ?? 'Something went wrong.')
    })
  }

  function block() {
    if (!window.confirm(copy.blockConfirm)) return
    startTransition(async () => {
      const result = await blockMessage({ threadDocId: conversation.threadDocId })
      if (result.ok) {
        onClose()
        router.refresh()
      } else setError(result.error ?? 'Something went wrong.')
    })
  }

  function mute() {
    const next = !muted
    setMutedState(next) // optimistic
    startTransition(async () => {
      const result = await toggleMute({ threadDocId: conversation.threadDocId, muted: next })
      if (!result.ok) {
        setMutedState(!next)
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <>
      {/* Header — back + avatar + name (+ optional collab context). Fixed at the
          top of the sheet (shrink-0, outside the scroll region, own z-layer) so
          it's always visible. Leaves room for the close X at top-right. */}
      <div className="border-border bg-background relative z-10 shrink-0 border-b px-4 py-3 pr-12 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            // aria-label: §2 exempts these from the no-hardcoded-copy rule.
            aria-label="Back to conversations"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-1 shrink-0 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <AvatarCircle
            src={conversation.otherAvatarUrl}
            name={conversation.otherName}
            className="size-9 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate">
              {conversation.otherSlug ? (
                <Link
                  href={`/creators/${conversation.otherSlug}`}
                  className="hover:text-primary transition-colors"
                >
                  {conversation.otherName}
                </Link>
              ) : (
                conversation.otherName
              )}
            </DialogTitle>
            {conversation.contextLabel && (
              <p className="text-muted-foreground mt-0.5 truncate text-xs font-bold tracking-wide uppercase">
                {conversation.contextLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages — the only scrolling region. `min-h-0` lets flex-1 actually
          constrain and scroll here, instead of the column overflowing and
          shoving the composer out of view. */}
      <div
        ref={scrollRef}
        className="bg-card min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-6"
      >
        {messages.length === 0 && outbox.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.threadsEmpty}</p>
        ) : (
          <>
            {messages.map((m) => {
              const mine = m.fromId === meId
              return (
                <div key={m.key} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] px-3 py-2 text-sm',
                      mine
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-white/15 text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    {m.createdAt && (
                      <p
                        className={cn(
                          'mt-1 text-[10px]',
                          mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {formatDate(m.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            {outbox.map((m) => (
              <div key={m.key} className="flex justify-end">
                <div className="bg-primary text-primary-foreground max-w-[80%] px-3 py-2 text-sm opacity-60">
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-primary-foreground/70 mt-1 text-[10px]">
                    {copy.sendingLabel}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Composer + actions — pinned below the scroll region. A little extra
          bottom room on mobile so the action row isn't flush to the edge. */}
      <div className="border-border shrink-0 border-t px-4 py-3 pb-5 sm:px-6 sm:pb-3">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            rows={2}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => {
              // Pin the last message just above the composer when the keyboard
              // opens. The resize path handles most of it; the timeout also beats
              // iOS's keyboard-open animation and the already-open case.
              requestAnimationFrame(pinToBottom)
              setTimeout(pinToBottom, 300)
            }}
            onKeyDown={(e) => {
              // Shift+Enter sends; plain Enter is a newline (per request).
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={copy.composerPlaceholder}
            /* 16px on touch so iOS doesn't zoom the field on focus; tighter on desktop. */
            className="focus-visible:ring-ring flex-1 resize-none border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={!body.trim()}
            aria-label={copy.sendLabel}
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <Send aria-hidden="true" className="size-4" />
            {copy.sendLabel}
          </button>
        </div>
        <p className="text-muted-foreground mt-1 text-[10px]">{copy.sendHint}</p>

        {error && (
          <p role="alert" className="text-destructive mt-2 text-sm">
            {error}
          </p>
        )}

        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold tracking-wide uppercase">
          <button
            type="button"
            onClick={mute}
            disabled={pending}
            className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {muted ? (
              <Bell aria-hidden="true" className="size-3.5" />
            ) : (
              <BellOff aria-hidden="true" className="size-3.5" />
            )}
            {muted ? copy.unmuteLabel : copy.muteLabel}
          </button>
          <button
            type="button"
            onClick={leave}
            disabled={pending}
            className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            {copy.leaveLabel}
          </button>
          <button
            type="button"
            onClick={block}
            disabled={pending}
            className="hover:text-destructive focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <ShieldX aria-hidden="true" className="size-3.5" />
            {copy.blockLabel}
          </button>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            disabled={pending}
            className="hover:text-destructive focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <Flag aria-hidden="true" className="size-3.5" />
            {copy.reportLabel}
          </button>
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        threadDocId={conversation.threadDocId}
        messageKey={lastOtherKey}
        copy={copy}
      />
    </>
  )
}

function ReportDialog({
  open,
  onOpenChange,
  threadDocId,
  messageKey,
  copy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadDocId: string
  messageKey: string
  copy: MessagingSettings
}) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const reasons = [
    { value: 'harassment', label: copy.reportReasonHarassment },
    { value: 'spam', label: copy.reportReasonSpam },
    { value: 'inappropriate', label: copy.reportReasonInappropriate },
    { value: 'other', label: copy.reportReasonOther },
  ]

  function submit() {
    if (!reason) {
      setError(copy.reportReasonLabel)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await reportMessage({ threadDocId, messageKey, reason, note })
      if (result.ok) setDone(true)
      else setError(result.error ?? 'Something went wrong.')
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setReason('')
          setNote('')
          setError(null)
          setDone(false)
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-black tracking-tight uppercase">
          {copy.reportHeading}
        </DialogTitle>

        {done ? (
          <p className="text-muted-foreground mt-3 text-sm">{copy.reportThanks}</p>
        ) : (
          <>
            <div className="mt-4">
              <label
                htmlFor="report-reason"
                className="mb-1.5 block text-xs tracking-widest uppercase"
              >
                {copy.reportReasonLabel}
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                }}
                className={cn(
                  'focus-visible:ring-ring w-full border bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm',
                  reason ? 'border-primary text-foreground' : 'text-muted-foreground border-white/20',
                )}
              >
                <option value="" className="bg-background text-foreground">
                  —
                </option>
                {reasons.map((r) => (
                  <option key={r.value} value={r.value} className="bg-background text-foreground">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={note}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              placeholder={copy.reportNotePlaceholder}
              className="focus-visible:ring-ring mt-3 w-full resize-none border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
            />

            {error && (
              <p role="alert" className="text-destructive mt-3 text-sm">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-2 px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
              >
                {pending && <Spinner />}
                {copy.reportSubmitLabel}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {copy.reportCancelLabel}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

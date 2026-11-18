'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, BellOff, Flag, LogOut, Send, ShieldX } from 'lucide-react'

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
 * The creator's conversations on /me. Active threads expand to a message panel
 * with a composer and the safety controls (leave / block / report). Sent
 * requests still awaiting a reply show as quiet "awaiting" rows. No realtime —
 * sending refreshes the server data (fine at beta scale).
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
  const [openId, setOpenId] = useState<string | null>(null)
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
            const isOpen = openId === c.threadDocId
            const showUnread = c.unread && !locallyRead.has(c.threadDocId)
            return (
              <li key={c.threadDocId} className="border-border border-b">
                <button
                  type="button"
                  onClick={() => {
                    const next = isOpen ? null : c.threadDocId
                    setOpenId(next)
                    if (next && showUnread) {
                      setLocallyRead((s) => new Set(s).add(c.threadDocId))
                      void markRead({ threadDocId: c.threadDocId })
                    }
                  }}
                  aria-expanded={isOpen}
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
                {isOpen && <ConversationPanel conversation={c} meId={meId} copy={copy} />}
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
    </section>
  )
}

function ConversationPanel({
  conversation,
  meId,
  copy,
}: {
  conversation: Conversation
  meId: string
  copy: MessagingSettings
}) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [messages, setMessages] = useState(conversation.messages)
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
  const refresh = useCallback(async () => {
    const res = await fetchThreadMessages({ threadDocId: conversation.threadDocId })
    if (!res) return
    const last = res.messages[res.messages.length - 1]
    if (last && last.key !== lastKeyRef.current) {
      lastKeyRef.current = last.key
      setMessages(res.messages)
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

  // Keep the pane pinned to the latest message (on open and on each new one).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Report snapshots the other person's most recent message, when there is one.
  const lastOtherKey =
    [...messages].reverse().find((m) => m.fromId !== meId)?.key ?? ''

  function send() {
    if (!body.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await sendMessage({ threadDocId: conversation.threadDocId, body })
      if (result.ok) {
        setBody('')
        void refresh()
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  function leave() {
    if (!window.confirm(copy.leaveConfirm)) return
    startTransition(async () => {
      const result = await optOutMessage({ threadDocId: conversation.threadDocId })
      if (result.ok) router.refresh()
      else setError(result.error ?? 'Something went wrong.')
    })
  }

  function block() {
    if (!window.confirm(copy.blockConfirm)) return
    startTransition(async () => {
      const result = await blockMessage({ threadDocId: conversation.threadDocId })
      if (result.ok) router.refresh()
      else setError(result.error ?? 'Something went wrong.')
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
    <div className="pb-4">
      {conversation.contextLabel && (
        <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
          {conversation.contextLabel}
        </p>
      )}
      <div
        ref={scrollRef}
        className="bg-card max-h-[50vh] space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.threadsEmpty}</p>
        ) : (
          messages.map((m) => {
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
          })
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={body}
          rows={2}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Shift+Enter sends; plain Enter is a newline (per request).
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={copy.composerPlaceholder}
          className="focus-visible:ring-ring flex-1 resize-none border border-white/20 bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !body.trim()}
          aria-label={copy.sendLabel}
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? (
            <Spinner className="size-4" />
          ) : (
            <Send aria-hidden="true" className="size-4" />
          )}
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

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        threadDocId={conversation.threadDocId}
        messageKey={lastOtherKey}
        copy={copy}
      />
    </div>
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
                  'focus-visible:ring-ring w-full border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none',
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
              className="focus-visible:ring-ring mt-3 w-full resize-none border border-white/20 bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
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

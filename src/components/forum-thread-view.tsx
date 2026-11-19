'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react'
import { Flag, ImagePlus, Pencil, Send, Trash2, X } from 'lucide-react'

import {
  createForumPost,
  createForumPostImage,
  deleteForumPost,
  editForumPost,
  editForumPostImage,
  fetchThreadPosts,
  markForumThreadRead,
  reportForumPost,
  type ForumPostView,
} from '@/app/actions/forum'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { ALLOWED_IMAGE_TYPES, downscaleToBox, MAX_PICK_BYTES } from '@/lib/intake/downscale'
import type { ForumSettings } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

type OutboxEntry = { key: string; body: string; previewUrl: string | null }

/** "11/18/2026 @11:42am" — the timestamp format used across the app layer. */
function formatPostTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('en-US')
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace(/\s/g, '')
    .toLowerCase()
  return `${date} @${time}`
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export function ForumThreadView({
  threadId,
  status: initialStatus,
  meId,
  initialPosts,
  copy,
}: {
  threadId: string
  status: string
  meId: string
  initialPosts: ForumPostView[]
  copy: ForumSettings
}) {
  const [posts, setPosts] = useState<ForumPostView[]>(initialPosts)
  const [status, setStatus] = useState(initialStatus)
  const [body, setBody] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outbox, setOutbox] = useState<OutboxEntry[]>([])
  const [editing, setEditing] = useState<ForumPostView | null>(null)
  const [reporting, setReporting] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const myImageCountRef = useRef(
    initialPosts.filter((p) => p.authorId === meId && p.imageUrl).length,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Opening the thread clears its unread marker for me.
  useEffect(() => {
    void markForumThreadRead({ threadId })
  }, [threadId])

  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const refresh = useCallback(async () => {
    const data = await fetchThreadPosts({ threadId })
    if (!data) return
    setStatus(data.status)
    setPosts(data.posts)
    // Reconcile optimistic bubbles against the authoritative list in the same
    // pass: drop my text bubbles whose body now appears, and my image bubbles by
    // count (images have no body to match on). Mirrors the messaging reconcile.
    const serverMineBodies = new Set(
      data.posts.filter((p) => p.authorId === meId && !p.deleted && p.body).map((p) => p.body),
    )
    const serverMyImages = data.posts.filter((p) => p.authorId === meId && p.imageUrl).length
    setOutbox((prev) => {
      let dropImages = Math.max(0, serverMyImages - myImageCountRef.current)
      return prev.filter((m) => {
        if (m.previewUrl) {
          if (dropImages > 0) {
            dropImages--
            return false
          }
          return true
        }
        return !serverMineBodies.has(m.body)
      })
    })
    myImageCountRef.current = serverMyImages
  }, [threadId, meId])

  // Near-real-time poll while the thread is open; paused when the tab is hidden.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 2500)
    return () => clearInterval(id)
  }, [refresh])

  const scrollToEnd = useCallback(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'end',
    })
  }, [])

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_PICK_BYTES) {
      setError('That image is too large.')
      return
    }
    const resized = await downscaleToBox(file, 1080, 1350)
    if (!ALLOWED_IMAGE_TYPES.includes(resized.type)) {
      setError('Use a JPEG, PNG, or WebP image.')
      return
    }
    const url = URL.createObjectURL(resized)
    objectUrls.current.push(url)
    setPendingFile(resized)
    setPendingPreview(url)
    setError(null)
  }

  function clearPending() {
    setPendingFile(null)
    setPendingPreview(null)
  }

  function send() {
    const text = body.trim()
    if (!text && !pendingFile) return

    if (pendingFile) {
      const file = pendingFile
      const preview = pendingPreview
      const key = `o-img-${Date.now()}`
      setOutbox((o) => [...o, { key, body: text, previewUrl: preview }])
      clearPending()
      setBody('')
      setError(null)
      startTransition(async () => {
        const fd = new FormData()
        fd.set('threadId', threadId)
        fd.set('body', text)
        fd.set('image', file)
        const res = await createForumPostImage(fd)
        if (res.ok) {
          await refresh()
          setOutbox((o) => o.filter((m) => m.key !== key))
          scrollToEnd()
        } else {
          setOutbox((o) => o.filter((m) => m.key !== key))
          setPendingFile(file)
          setPendingPreview(preview)
          setBody((b) => (b.trim() ? b : text))
          setError(res.error ?? 'Something went wrong.')
        }
      })
      return
    }

    const key = `o-${Date.now()}`
    setOutbox((o) => [...o, { key, body: text, previewUrl: null }])
    setBody('')
    setError(null)
    startTransition(async () => {
      const res = await createForumPost({ threadId, body: text })
      if (res.ok) {
        await refresh()
        setOutbox((o) => o.filter((m) => m.key !== key))
        scrollToEnd()
      } else {
        setOutbox((o) => o.filter((m) => m.key !== key))
        setBody((b) => (b.trim() ? b : text))
        setError(res.error ?? 'Something went wrong.')
      }
    })
  }

  const locked = status === 'locked'

  return (
    <div>
      <ol className="border-border divide-border divide-y border-y">
        {posts.map((p) => (
          <li key={p.key} className="py-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-bold">{p.authorName}</span>
              {p.isOpener && (
                <span className="text-muted-foreground uppercase">· {copy.openerLabel}</span>
              )}
              <span className="text-muted-foreground">· {formatPostTime(p.createdAt)}</span>
              {!p.deleted && p.editedAt && (
                <span className="text-muted-foreground italic">({copy.editedLabel})</span>
              )}
            </div>

            {p.deleted ? (
              <p className="text-muted-foreground mt-2 text-sm italic">{copy.deletedLabel}</p>
            ) : (
              <div className="mt-2">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={`Image from ${p.authorName}`}
                    className="border-border mb-2 block max-h-[480px] max-w-full border"
                  />
                )}
                {p.body && <p className="text-sm whitespace-pre-wrap">{p.body}</p>}
              </div>
            )}

            {!p.deleted && (
              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold tracking-wide uppercase">
                {p.authorId === meId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <Pencil aria-hidden="true" className="size-3.5" />
                      {copy.editLabel}
                    </button>
                    <DeleteButton postId={p.key} copy={copy} onDone={refresh} />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReporting(p.key)}
                    className="hover:text-destructive focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Flag aria-hidden="true" className="size-3.5" />
                    {copy.reportLabel}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}

        {outbox.map((m) => (
          <li key={m.key} className="py-5 opacity-60">
            <div className="text-muted-foreground text-xs font-bold">{copy.sendingLabel}</div>
            <div className="mt-2">
              {m.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.previewUrl}
                  alt=""
                  className="border-border mb-2 block max-h-[480px] max-w-full border"
                />
              )}
              {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
            </div>
          </li>
        ))}
      </ol>

      <div ref={bottomRef} />

      {locked ? (
        <p className="text-muted-foreground border-border mt-6 border border-dashed px-4 py-6 text-center text-sm">
          {copy.lockedNotice}
        </p>
      ) : (
        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPick}
          />
          {pendingPreview && (
            <div className="relative mb-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingPreview}
                alt=""
                className="border-border block max-h-40 max-w-full border"
              />
              <button
                type="button"
                onClick={clearPending}
                aria-label={copy.removeImageLabel}
                className="bg-background text-foreground hover:text-primary focus-visible:ring-ring absolute -top-2 -right-2 border border-white/30 p-0.5 focus-visible:ring-2 focus-visible:outline-none"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          )}
          <textarea
            value={body}
            rows={3}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={copy.replyPlaceholder}
            className="focus-visible:ring-ring w-full resize-y border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={send}
              disabled={pending || (!body.trim() && !pendingFile)}
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              {pending ? <Spinner /> : <Send aria-hidden="true" className="size-4" />}
              {copy.replyLabel}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              aria-label="Attach an image"
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex items-center justify-center border border-white/20 px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              <ImagePlus aria-hidden="true" className="size-5" />
            </button>
            <span className="text-muted-foreground ml-auto text-[10px]">{copy.sendHint}</span>
          </div>
          {error && (
            <p role="alert" className="text-destructive mt-2 text-sm">
              {error}
            </p>
          )}
        </div>
      )}

      {editing && (
        <EditDialog
          post={editing}
          copy={copy}
          onOpenChange={(open) => !open && setEditing(null)}
          onDone={async () => {
            setEditing(null)
            await refresh()
          }}
        />
      )}
      <ReportDialog
        postId={reporting}
        copy={copy}
        onOpenChange={(open) => !open && setReporting(null)}
      />
    </div>
  )
}

function DeleteButton({
  postId,
  copy,
  onDone,
}: {
  postId: string
  copy: ForumSettings
  onDone: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(copy.deleteConfirm)) return
        startTransition(async () => {
          await deleteForumPost({ postId })
          await onDone()
        })
      }}
      className="hover:text-destructive focus-visible:ring-ring inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      <Trash2 aria-hidden="true" className="size-3.5" />
      {copy.deleteLabel}
    </button>
  )
}

function EditDialog({
  post,
  copy,
  onOpenChange,
  onDone,
}: {
  post: ForumPostView
  copy: ForumSettings
  onOpenChange: (open: boolean) => void
  onDone: () => Promise<void>
}) {
  const [body, setBody] = useState(post.body)
  const [removeImage, setRemoveImage] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef<string[]>([])

  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url)
    },
    [],
  )

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_PICK_BYTES) {
      setError('That image is too large.')
      return
    }
    const resized = await downscaleToBox(file, 1080, 1350)
    if (!ALLOWED_IMAGE_TYPES.includes(resized.type)) {
      setError('Use a JPEG, PNG, or WebP image.')
      return
    }
    const url = URL.createObjectURL(resized)
    objectUrls.current.push(url)
    setPendingFile(resized)
    setPendingPreview(url)
    setRemoveImage(false)
    setError(null)
  }

  function save() {
    if (!body.trim()) {
      setError('A post can’t be empty.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = pendingFile
        ? await (async () => {
            const fd = new FormData()
            fd.set('postId', post.key)
            fd.set('body', body)
            fd.set('image', pendingFile)
            return editForumPostImage(fd)
          })()
        : await editForumPost({ postId: post.key, body, removeImage })
      if (res.ok) await onDone()
      else setError(res.error ?? 'Something went wrong.')
    })
  }

  const showsCurrentImage = Boolean(post.imageUrl) && !removeImage && !pendingPreview

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-black tracking-tight uppercase">
          {copy.editingHeading}
        </DialogTitle>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />

        {(showsCurrentImage || pendingPreview) && (
          <div className="relative mt-4 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingPreview ?? post.imageUrl ?? ''}
              alt=""
              className="border-border block max-h-40 max-w-full border"
            />
            <button
              type="button"
              onClick={() => {
                setPendingFile(null)
                setPendingPreview(null)
                setRemoveImage(true)
              }}
              aria-label={copy.removeImageLabel}
              className="bg-background text-foreground hover:text-primary focus-visible:ring-ring absolute -top-2 -right-2 border border-white/30 p-0.5 focus-visible:ring-2 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        )}

        <textarea
          value={body}
          rows={5}
          onChange={(e) => setBody(e.target.value)}
          className="focus-visible:ring-ring mt-4 w-full resize-y border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
        />

        {error && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-2 px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {pending && <Spinner />}
            {copy.saveLabel}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
            aria-label="Replace image"
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex items-center justify-center border border-white/20 px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <ImagePlus aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {copy.cancelLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportDialog({
  postId,
  copy,
  onOpenChange,
}: {
  postId: string | null
  copy: ForumSettings
  onOpenChange: (open: boolean) => void
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
    if (!postId) return
    if (!reason) {
      setError(copy.reportReasonLabel)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await reportForumPost({ postId, reason, note })
      if (result.ok) setDone(true)
      else setError(result.error ?? 'Something went wrong.')
    })
  }

  return (
    <Dialog
      open={postId !== null}
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
                htmlFor="forum-report-reason"
                className="mb-1.5 block text-xs tracking-widest uppercase"
              >
                {copy.reportReasonLabel}
              </label>
              <select
                id="forum-report-reason"
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

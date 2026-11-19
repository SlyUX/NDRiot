'use client'

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Plus, X } from 'lucide-react'

import { createForumThread, createForumThreadImage } from '@/app/actions/forum'
import { ALLOWED_IMAGE_TYPES, downscaleToBox, MAX_PICK_BYTES } from '@/lib/intake/downscale'
import { Spinner } from '@/components/ui/spinner'
import type { ForumSettings } from '@/lib/site-settings'

/**
 * The "New thread" composer on a board page. A button that reveals a title +
 * body (+ optional image) form; on success it routes to the new thread. Image
 * path reuses the messaging pipeline (downscale → FormData → private upload).
 */
export function ForumNewThread({
  categoryId,
  categorySlug,
  copy,
}: {
  categoryId: string
  categorySlug: string
  copy: ForumSettings
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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
    setError(null)
  }

  function clearPending() {
    setPendingFile(null)
    setPendingPreview(null)
  }

  function reset() {
    setOpen(false)
    setTitle('')
    setBody('')
    clearPending()
    setError(null)
  }

  function submit() {
    if (!title.trim()) {
      setError('Give your thread a title.')
      return
    }
    if (!body.trim()) {
      setError('Write your opening post.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = pendingFile
        ? await (async () => {
            const fd = new FormData()
            fd.set('categoryId', categoryId)
            fd.set('title', title)
            fd.set('body', body)
            fd.set('image', pendingFile)
            return createForumThreadImage(fd)
          })()
        : await createForumThread({ categoryId, title, body })
      if (result.ok && result.threadId) {
        router.push(`/forum/${categorySlug}/${result.threadId}`)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black tracking-widest uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Plus aria-hidden="true" className="size-4" />
        {copy.newThreadLabel}
      </button>
    )
  }

  return (
    <div className="border-border bg-card border p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />
      <label htmlFor="forum-thread-title" className="mb-1.5 block text-xs tracking-widest uppercase">
        {copy.threadTitleLabel}
      </label>
      <input
        id="forum-thread-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={copy.threadTitlePlaceholder}
        maxLength={140}
        className="focus-visible:ring-ring mb-3 w-full border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
      />

      {pendingPreview && (
        <div className="relative mb-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingPreview} alt="" className="border-border block max-h-40 max-w-full border" />
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
        rows={5}
        onChange={(e) => setBody(e.target.value)}
        placeholder={copy.threadBodyPlaceholder}
        className="focus-visible:ring-ring w-full resize-y border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
      />

      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-2 px-4 py-2 text-xs font-black tracking-widest uppercase transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          {pending && <Spinner />}
          {copy.threadSubmitLabel}
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
        <button
          type="button"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {copy.cancelLabel}
        </button>
      </div>
    </div>
  )
}

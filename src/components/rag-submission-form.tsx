'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { submitRagSubmission, type RagSubmissionState } from '@/app/actions/rag-submission'
import { Button } from '@/components/ui/button'
import { ALLOWED_IMAGE_TYPES, MAX_PICK_BYTES, downscaleImage } from '@/lib/intake/downscale'
import { ragIssueLabel } from '@/lib/rag'
import type { RagOpenSubmission } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The ND Riot Rag submission form — creator-only, shown on an open issue's page.
 * Presentational; the write (and every re-check) lives in `submitRagSubmission`.
 * Copy is CMS-managed (§2). Sample images are downscaled in the browser before
 * upload, like the strip/comic intake forms.
 */

export interface RagSubmitCopy {
  heading: string
  intro: string
  issueLabel: string
  pitchLabel: string
  pitchHelp: string
  pagesLabel: string
  samplesLabel: string
  samplesHelp: string
  linkLabel: string
  button: string
  success: string
}

const PITCH_WORD_LIMIT = 750

const INITIAL: RagSubmissionState = { status: 'idle' }

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none aria-[invalid=true]:border-destructive'
const labelClass = 'block text-xs tracking-widest uppercase'
const hintClass = 'text-foreground text-xs'

function wordCount(value: string): number {
  const t = value.trim()
  return t ? t.split(/\s+/).length : 0
}

export function RagSubmissionForm({
  copy,
  openIssues,
  currentIssueId,
  csamNotice,
}: {
  copy: RagSubmitCopy
  openIssues: RagOpenSubmission[]
  currentIssueId: string
  csamNotice: string
}) {
  const [state, action, pending] = useActionState(submitRagSubmission, INITIAL)

  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  const [words, setWords] = useState(() => wordCount(state.values?.pitch ?? ''))
  const [imageError, setImageError] = useState('')

  const onSamplesPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    setImageError('')
    if (files.length === 0) return
    const dt = new DataTransfer()
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        input.value = ''
        return setImageError('Use JPG, PNG, or WebP images.')
      }
      if (file.size > MAX_PICK_BYTES) {
        input.value = ''
        return setImageError('One of those images is too large.')
      }
      const resized = await downscaleImage(file)
      dt.items.add(resized)
    }
    input.files = dt.files
  }

  if (state.status === 'success') {
    return (
      <p role="status" className="border-personalize text-foreground border-l-2 py-2 pl-4 text-sm">
        {copy.success}
      </p>
    )
  }

  const errors = state.fieldErrors ?? {}
  const values = state.values
  const overLimit = words > PITCH_WORD_LIMIT

  return (
    <form action={action} encType="multipart/form-data" className="space-y-8" noValidate>
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={timingRef} type="hidden" name="t" />

      {/* Issue — a picker only when several are open; otherwise it's fixed to the
          issue whose page this is. */}
      {openIssues.length > 1 ? (
        <div className="space-y-1.5">
          <label htmlFor="issueId" className={labelClass}>
            {copy.issueLabel}
          </label>
          <select
            id="issueId"
            name="issueId"
            defaultValue={values?.issueId ?? currentIssueId}
            className={cn(fieldClass, 'appearance-none')}
          >
            {openIssues.map((i) => (
              <option key={i._id} value={i._id}>
                {ragIssueLabel(i.issueNumber, i.title)}
              </option>
            ))}
          </select>
          {errors.issue && <p className="text-destructive text-xs">{errors.issue}</p>}
        </div>
      ) : (
        <input type="hidden" name="issueId" value={currentIssueId} />
      )}

      <div className="space-y-1.5">
        <label htmlFor="pitch" className={labelClass}>
          {copy.pitchLabel}
        </label>
        <textarea
          id="pitch"
          name="pitch"
          rows={8}
          required
          defaultValue={values?.pitch ?? ''}
          onChange={(e) => setWords(wordCount(e.currentTarget.value))}
          aria-invalid={Boolean(errors.pitch)}
          aria-describedby="pitch-help"
          className={cn(fieldClass, 'resize-y')}
        />
        <p id="pitch-help" className={cn(hintClass, overLimit && 'text-destructive')}>
          {copy.pitchHelp} — {words}/{PITCH_WORD_LIMIT} words
        </p>
        {errors.pitch && <p className="text-destructive text-xs">{errors.pitch}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pageCount" className={labelClass}>
          {copy.pagesLabel}
        </label>
        <select
          id="pageCount"
          name="pageCount"
          required
          defaultValue={values?.pageCount ?? ''}
          aria-invalid={Boolean(errors.pageCount)}
          className={cn(fieldClass, 'appearance-none')}
        >
          <option value="">—</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {errors.pageCount && <p className="text-destructive text-xs">{errors.pageCount}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="samples" className={labelClass}>
          {copy.samplesLabel}
        </label>
        <input
          id="samples"
          name="samples"
          type="file"
          accept="image/*"
          multiple
          onChange={onSamplesPick}
          aria-invalid={Boolean(errors.samples)}
          className={cn(
            fieldClass,
            'file:text-primary file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase',
          )}
        />
        {imageError && <p className="text-destructive text-xs">{imageError}</p>}
        <p className={hintClass}>{copy.samplesHelp}</p>
        <p className={hintClass}>{csamNotice}</p>

        <label htmlFor="workSampleLink" className={cn(labelClass, 'pt-2')}>
          {copy.linkLabel}
        </label>
        <input
          id="workSampleLink"
          name="workSampleLink"
          type="url"
          inputMode="url"
          placeholder="https://"
          defaultValue={values?.workSampleLink ?? ''}
          className={fieldClass}
        />
        {errors.samples && <p className="text-destructive text-xs">{errors.samples}</p>}
      </div>

      {state.status === 'error' && !state.fieldErrors && (
        <p role="alert" className="text-destructive text-sm">
          {state.message ?? 'Something went wrong — please try again.'}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="font-black tracking-wide uppercase">
        {copy.button}
      </Button>
    </form>
  )
}

'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { submitStrip, type StripIntakeState } from '@/app/actions/strip-intake'
import { ReviewNotice } from '@/components/review-notice'
import { Button } from '@/components/ui/button'
import { ALLOWED_IMAGE_TYPES, MAX_PICK_BYTES, downscaleImage } from '@/lib/intake/downscale'
import { GENRES, MATURITY_RATINGS, MATURITY_DESCRIPTIONS } from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import type {
  CreatorIntakeSettings,
  ReviewNoticeSettings,
  StripIntakeSettings,
} from '@/lib/site-settings'

/**
 * On-site strip intake — the dashboard composer's form. A strip is a
 * single-page comic hosted here, so it's image-first, and deliberately lean:
 * the creator is already known (the composer opens from their card, so it's
 * posted, not asked), and the optional fields (description, caption, genre,
 * series) collapse behind one disclosure. Required and visible: title, the
 * page, the audience, permission.
 *
 * Presentational — strip-specific copy comes in as `copy`; generic strings
 * shared with the creator form (image errors, optional marker) as `common`; the
 * shared review explainer as `reviewNotice`. The write lives in the
 * `submitStrip` action, which re-checks that this email owns `creator`.
 */

const INITIAL: StripIntakeState = { status: 'idle' }

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none aria-[invalid=true]:border-destructive'
const labelClass = 'block text-xs tracking-widest uppercase'
const hintClass = 'text-foreground text-xs'

export interface OwnedCreator {
  _id: string
  name: string
}

export interface SeriesOption {
  _id: string
  title: string
}

/** Prefilled values when editing an existing strip. */
export interface StripIntakeInitial {
  updateId: string
  title: string
  caption: string
  imageAlt: string
  genre: string
  maturity: string
  seriesId: string | null
  imageUrl: string | null
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-primary/40 text-primary border-b pb-2 text-sm font-black tracking-widest uppercase">
      {children}
    </h2>
  )
}

function Optional({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground ml-2 text-[0.65rem] tracking-wider normal-case">
      ({label})
    </span>
  )
}

export function StripIntakeForm({
  copy,
  common,
  reviewNotice,
  creator,
  series,
  initial,
}: {
  copy: StripIntakeSettings
  common: CreatorIntakeSettings
  reviewNotice: ReviewNoticeSettings
  creator: OwnedCreator
  series: SeriesOption[]
  initial?: StripIntakeInitial
}) {
  const editing = Boolean(initial)
  const [state, action, pending] = useActionState(submitStrip, INITIAL)

  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  const [imageError, setImageError] = useState('')
  const onImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    setImageError('')
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      input.value = ''
      return setImageError(common.imageTypeError)
    }
    if (file.size > MAX_PICK_BYTES) {
      input.value = ''
      return setImageError(common.imageSizeError)
    }
    const resized = await downscaleImage(file)
    if (resized !== file) {
      const dt = new DataTransfer()
      dt.items.add(resized)
      input.files = dt.files
    }
  }

  if (state.status === 'success') {
    return (
      <div className="space-y-4">
        <p role="status" className="border-primary text-foreground border-l-2 py-2 pl-4 text-sm">
          {copy.successMessage}
        </p>
        <ReviewNotice copy={reviewNotice} variant="full" />
      </div>
    )
  }

  const errors = state.fieldErrors ?? {}
  const values = state.values

  return (
    <form action={action} encType="multipart/form-data" className="space-y-10" noValidate>
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={timingRef} type="hidden" name="t" />
      {/* Creator is known (this composer opened from their card) — posted, not
          asked. The action re-checks that the signed-in email owns it. */}
      <input type="hidden" name="creator" value={creator._id} />
      {editing && <input type="hidden" name="updateId" value={initial!.updateId} />}

      {/* — What it is — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionWhat}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="title" className={labelClass}>
            {copy.titleLabel}
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={values?.title ?? initial?.title ?? ''}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={fieldClass}
          />
          {errors.title && (
            <p id="title-error" className="text-destructive text-xs">
              {errors.title}
            </p>
          )}
          {errors.creator && <p className="text-destructive text-xs">{errors.creator}</p>}
        </div>

        <p className="text-muted-foreground text-xs">
          {copy.creatorLabel}: <span className="text-foreground font-semibold">{creator.name}</span>
        </p>
      </fieldset>

      {/* — The page — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionImage}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="image" className={labelClass}>
            {copy.imageLabel}
          </label>
          {editing && initial?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={initial.imageUrl}
              alt=""
              className="mb-2 max-h-32 w-auto border border-white/10"
            />
          )}
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            required={!editing}
            onChange={onImagePick}
            aria-invalid={Boolean(errors.image)}
            className={cn(
              fieldClass,
              'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase file:text-primary',
            )}
          />
          {imageError && <p className="text-destructive text-xs">{imageError}</p>}
          {errors.image && <p className="text-destructive text-xs">{errors.image}</p>}
          <p className={hintClass}>{copy.imageHint}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="maturity" className={labelClass}>
            {copy.maturityLabel}
          </label>
          <select
            id="maturity"
            name="maturity"
            required
            defaultValue={initial?.maturity ?? ''}
            aria-invalid={Boolean(errors.maturity)}
            className={cn(fieldClass, 'appearance-none')}
          >
            <option value="">{copy.maturityPlaceholder}</option>
            {MATURITY_RATINGS.map((m) => (
              <option key={m} value={m}>
                {m} — {MATURITY_DESCRIPTIONS[m]}
              </option>
            ))}
          </select>
          {errors.maturity && <p className="text-destructive text-xs">{errors.maturity}</p>}
        </div>
      </fieldset>

      {/* — Optional details, collapsed by default (open when editing) — */}
      <details className="group border-border border" open={editing}>
        <summary className="text-primary flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-black tracking-widest uppercase">
          {copy.optionalDetailsLabel}
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="border-border space-y-5 border-t p-4">
          <div className="space-y-1.5">
            <label htmlFor="imageAlt" className={labelClass}>
              {copy.imageAltLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <input
              id="imageAlt"
              name="imageAlt"
              type="text"
              defaultValue={values?.imageAlt ?? initial?.imageAlt ?? ''}
              className={fieldClass}
            />
            <p className={hintClass}>{copy.imageAltHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="caption" className={labelClass}>
              {copy.captionLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <textarea
              id="caption"
              name="caption"
              rows={2}
              maxLength={150}
              defaultValue={values?.caption ?? initial?.caption ?? ''}
              className={cn(fieldClass, 'resize-y')}
            />
            <p className={hintClass}>{copy.captionHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="genre" className={labelClass}>
              {copy.genreLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <select id="genre" name="genre" defaultValue={initial?.genre ?? ''} className={cn(fieldClass, 'appearance-none')}>
              <option value="">{copy.genrePlaceholder}</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <p className={hintClass}>{copy.genreHint}</p>
          </div>

          {/* Series — pick an existing one, or name a new one (created
              review-gated alongside the strip). */}
          <div className="space-y-1.5">
            <label htmlFor={series.length > 0 ? 'seriesId' : 'newSeriesName'} className={labelClass}>
              {copy.seriesLabel}
              <Optional label={common.optionalLabel} />
            </label>
            {series.length > 0 && (
              <select id="seriesId" name="seriesId" defaultValue={initial?.seriesId ?? ''} className={cn(fieldClass, 'appearance-none')}>
                <option value="">{copy.seriesNoneLabel}</option>
                {series.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
            <input
              id="newSeriesName"
              type="text"
              name="newSeriesName"
              maxLength={200}
              placeholder={copy.newSeriesPlaceholder}
              aria-label={copy.newSeriesLabel}
              className={fieldClass}
            />
            <p className={hintClass}>{copy.seriesHint}</p>
          </div>
        </div>
      </details>

      {/* — Permission — */}
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="permission"
            value="yes"
            required
            defaultChecked={editing}
            aria-invalid={Boolean(errors.permission)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span>{copy.permissionStatement}</span>
        </label>
        {errors.permission && <p className="text-destructive text-xs">{errors.permission}</p>}
      </div>

      {state.status === 'error' && !state.fieldErrors && (
        <p role="alert" className="text-destructive text-sm">
          {state.message ?? copy.errorMessage}
        </p>
      )}

      {/* The expectation, right where they commit (§ review notice). */}
      <ReviewNotice copy={reviewNotice} variant="compact" />

      <Button type="submit" size="lg" disabled={pending} className="font-black tracking-wide uppercase">
        {copy.submitLabel}
      </Button>
    </form>
  )
}

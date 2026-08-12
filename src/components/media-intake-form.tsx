'use client'

import Image from 'next/image'
import { useActionState, useEffect, useRef, useState } from 'react'

import { submitMedia, type MediaIntakeState } from '@/app/actions/media-intake'
import { PairedRowsField } from '@/components/paired-rows-field'
import { Button } from '@/components/ui/button'
import { ALLOWED_IMAGE_TYPES, MAX_PICK_BYTES, downscaleImage } from '@/lib/intake/downscale'
import { slugify } from '@/lib/intake/mapping'
import { GENRES, MEDIA_KINDS } from '@/lib/taxonomy'
import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'
import type { CreatorIntakeSettings, MediaIntakeSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'

/**
 * On-site media intake. Book-form shape: book-specific copy as `copy`, generic
 * shared strings as `common`. The write lives in the `submitMedia` action.
 */

const INITIAL: MediaIntakeState = { status: 'idle' }

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none aria-[invalid=true]:border-destructive'
const labelClass = 'block text-xs tracking-widest uppercase'
const hintClass = 'text-muted-foreground text-xs'

export interface MediaPickerItem {
  _id: string
  name: string
}

export interface MediaIntakeInitial {
  updateId: string
  name: string
  slug: string
  kinds: string[]
  about: string
  genresCovered: string[]
  pitchInfo: string
  logo: SanityImage | null
  logoAlt: string
  links: { label: string; url: string }[]
  feedUrl: string
  feedConsent: boolean
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-primary/40 text-primary border-b pb-2 text-sm font-black tracking-widest uppercase">
      {children}
    </h2>
  )
}

function Optional({ label }: { label: string }) {
  return <span className="text-muted-foreground ml-2 text-[0.65rem] tracking-wider normal-case">({label})</span>
}

function MediaPicker({ media, copy }: { media: MediaPickerItem[]; copy: MediaIntakeSettings }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = q ? media.filter((m) => m.name.toLowerCase().includes(q)) : media
  return (
    <div className="space-y-2">
      <label htmlFor="media-search" className={labelClass}>
        {copy.updatePrompt}
      </label>
      <input
        id="media-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.updateSelectLabel}
        autoComplete="off"
        className={cn(fieldClass, 'sm:max-w-sm')}
      />
      <ul className="border-primary/20 max-h-56 divide-y divide-white/10 overflow-y-auto border">
        {matches.length === 0 ? (
          <li className="text-muted-foreground px-3 py-2 text-sm">{copy.updateNoMatchLabel}</li>
        ) : (
          matches.map((m) => (
            <li key={m._id}>
              <a
                href={`/join/media?editing=${encodeURIComponent(m._id)}`}
                className="hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 block px-3 py-2 text-sm focus-visible:outline-none"
              >
                {m.name}
              </a>
            </li>
          ))
        )}
      </ul>
      <p className={hintClass}>{copy.updateSkipHint}</p>
    </div>
  )
}

export function MediaIntakeForm({
  copy,
  common,
  media,
  initial,
}: {
  copy: MediaIntakeSettings
  common: CreatorIntakeSettings
  media: MediaPickerItem[]
  initial?: MediaIntakeInitial
}) {
  const [state, action, pending] = useActionState(submitMedia, INITIAL)
  const editing = Boolean(initial)

  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  const [name, setName] = useState(state.values?.name ?? initial?.name ?? '')
  const [slug, setSlug] = useState(state.values?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(state.values?.slug))
  const sanitizeSlug = (v: string) =>
    v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-')
  const onName = (v: string) => {
    setName(v)
    if (!editing && !slugTouched) setSlug(slugify(v))
  }

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
      <p role="status" className="border-primary text-foreground border-l-2 py-2 pl-4 text-sm">
        {copy.successMessage}
      </p>
    )
  }

  const errors = state.fieldErrors ?? {}
  const values = state.values
  const text = (field: keyof NonNullable<MediaIntakeState['values']>, fromInitial?: string) =>
    values?.[field] ?? fromInitial ?? ''

  return (
    <>
      {media.length > 0 && !editing && (
        <div className="border-primary/20 mb-10 border-b pb-8">
          <MediaPicker media={media} copy={copy} />
        </div>
      )}

      {editing && (
        <div className="border-primary/40 mb-10 border-l-2 py-2 pl-4">
          <p className="text-sm">{copy.editingNotice.replace('{name}', initial!.name)}</p>
          <a href="/join/media?new" className="text-primary mt-1 inline-block text-xs underline underline-offset-4">
            {copy.editingResetLabel}
          </a>
        </div>
      )}

      <form action={action} encType="multipart/form-data" className="space-y-10" noValidate>
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input ref={timingRef} type="hidden" name="t" />
        {editing && <input type="hidden" name="updateId" value={initial!.updateId} />}

        {/* — About — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionAbout}</SectionHeading>

          <div className="space-y-1.5">
            <label htmlFor="name" className={labelClass}>
              {copy.nameLabel}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={150}
              value={name}
              onChange={(e) => onName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              className={fieldClass}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          {!editing && (
            <div className="space-y-1.5">
              <label htmlFor="slug" className={labelClass}>
                {copy.slugLabel}
                <Optional label={common.optionalLabel} />
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                pattern="[a-z0-9-]*"
                value={slug}
                onChange={(e) => {
                  setSlug(sanitizeSlug(e.target.value))
                  setSlugTouched(true)
                }}
                className={fieldClass}
              />
              <p className={hintClass}>{copy.slugHint}</p>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className={labelClass}>{copy.kindLabel}</legend>
            <p className={hintClass}>{copy.kindHint}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MEDIA_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="kinds"
                    value={k}
                    defaultChecked={initial?.kinds.includes(k)}
                    aria-invalid={Boolean(errors.kinds)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {k}
                </label>
              ))}
            </div>
            {errors.kinds && <p className="text-destructive text-xs">{errors.kinds}</p>}
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="about" className={labelClass}>
              {copy.aboutLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <textarea
              id="about"
              name="about"
              rows={3}
              maxLength={2000}
              defaultValue={text('about', initial?.about)}
              className={cn(fieldClass, 'resize-y')}
            />
            <p className={hintClass}>{copy.aboutHint}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClass}>
              {copy.genresLabel}
              <Optional label={common.optionalLabel} />
            </legend>
            <p className={hintClass}>{copy.genresHint}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GENRES.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="genresCovered"
                    value={g}
                    defaultChecked={initial?.genresCovered.includes(g)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {g}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="pitchInfo" className={labelClass}>
              {copy.pitchLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <textarea
              id="pitchInfo"
              name="pitchInfo"
              rows={3}
              maxLength={2000}
              defaultValue={text('pitchInfo', initial?.pitchInfo)}
              className={cn(fieldClass, 'resize-y')}
            />
            <p className={hintClass}>{copy.pitchHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="logo" className={labelClass}>
              {copy.logoLabel}
              <Optional label={common.optionalLabel} />
            </label>
            {initial?.logo && (
              <div className="mb-2 flex items-center gap-3">
                <Image
                  src={urlFor(initial.logo).width(128).url()}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 shrink-0 object-contain"
                />
                <p className={hintClass}>{common.photoCurrentHint}</p>
              </div>
            )}
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              onChange={onImagePick}
              className={cn(fieldClass, 'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase file:text-primary')}
            />
            {imageError && <p className="text-destructive text-xs">{imageError}</p>}
            <p className={hintClass}>{copy.logoHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="logoAlt" className={labelClass}>
              {copy.logoAltLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <input
              id="logoAlt"
              name="logoAlt"
              type="text"
              defaultValue={text('logoAlt', initial?.logoAlt)}
              className={fieldClass}
            />
            <p className={hintClass}>{copy.logoAltHint}</p>
          </div>
        </fieldset>

        {/* — Where to find it — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionReach}</SectionHeading>
          <PairedRowsField
            legend={copy.linksLabel}
            hint={copy.linksHint}
            optionalLabel={common.optionalLabel}
            leftName="linkLabel"
            leftPlaceholder={common.workPlatformPlaceholder}
            rightName="linkUrl"
            rightPlaceholder={common.workUrlPlaceholder}
            rightDefault="https://www."
            addLabel={common.workAddLabel}
            removeLabel={common.workRemoveLabel}
            initial={initial?.links.map((l) => ({ left: l.label, right: l.url }))}
          />

          <div className="space-y-1.5">
            <label htmlFor="feedUrl" className={labelClass}>
              {copy.feedUrlLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <input
              id="feedUrl"
              name="feedUrl"
              type="url"
              defaultValue={text('feedUrl', initial?.feedUrl)}
              aria-invalid={Boolean(errors.feedUrl)}
              aria-describedby="feedUrl-hint"
              className={fieldClass}
            />
            <p id="feedUrl-hint" className={hintClass}>
              {copy.feedUrlHint}
            </p>
            {errors.feedUrl && <p className="text-destructive text-xs">{errors.feedUrl}</p>}

            <label className="flex items-start gap-3 pt-1 text-sm">
              <input
                type="checkbox"
                name="feedConsent"
                value="yes"
                defaultChecked={initial?.feedConsent}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>{copy.feedConsentLabel}</span>
            </label>
          </div>
        </fieldset>

        {/* — Permission — */}
        <fieldset className="space-y-5">
          <SectionHeading>{common.sectionPermission}</SectionHeading>

          <div className="space-y-1.5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="permission"
                value="yes"
                required
                aria-invalid={Boolean(errors.permission)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>{copy.permissionStatement}</span>
            </label>
            {errors.permission && <p className="text-destructive text-xs">{errors.permission}</p>}
          </div>

          {/* Optional newsletter opt-in — shared label with the creator form
              (common), unticked by default; subscribes the signed-in email. */}
          <div className="space-y-1.5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="newsletterOptIn"
                value="yes"
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>{common.newsletterOptInLabel}</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="anythingElse" className={labelClass}>
              {copy.anythingElseLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <textarea
              id="anythingElse"
              name="anythingElse"
              rows={3}
              defaultValue={text('anythingElse')}
              className={cn(fieldClass, 'resize-y')}
            />
          </div>
        </fieldset>

        {state.status === 'error' && !state.fieldErrors && (
          <p role="alert" className="text-destructive text-sm">
            {state.message ?? copy.errorMessage}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="font-black tracking-wide uppercase">
          {copy.submitLabel}
        </Button>
      </form>
    </>
  )
}

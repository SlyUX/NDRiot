'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { submitCreator, type CreatorIntakeState } from '@/app/actions/creator-intake'
import { Button } from '@/components/ui/button'
import { GENRES, FORMATS, MATURITY_RATINGS, MATURITY_DESCRIPTIONS } from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import type { CreatorIntakeSettings } from '@/lib/site-settings'

/**
 * On-site creator intake — Stage 3. Presentational: every label is passed in
 * from Sanity (§2), and the write lives in the `submitCreator` Server Action.
 *
 * Built on a plain multipart <form action={…}> so it submits without
 * JavaScript; useActionState upgrades it with pending state and inline errors
 * once hydrated. The only thing JS adds beyond that is the live three-genre
 * cap — the server enforces the cap regardless, so no-JS just loses the visual
 * disabling, not the guarantee.
 *
 * Organizations are a live list from Sanity (existing docs only). The form
 * never creates one — a "not listed" studio goes in the free-text note and the
 * team wires it up on review, which keeps every anonymous write a single
 * creator draft.
 */

const INITIAL: CreatorIntakeState = { status: 'idle' }

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none aria-[invalid=true]:border-destructive'

const labelClass = 'block text-xs tracking-widest uppercase'
const hintClass = 'text-muted-foreground text-xs'

export interface CreatorIntakeOrg {
  _id: string
  name: string
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-primary/40 text-primary border-b pb-2 text-sm font-black tracking-widest uppercase">
      {children}
    </h2>
  )
}

/** Small "(optional)" marker beside a label. */
function Optional({ label }: { label: string }) {
  return <span className="text-muted-foreground ml-2 text-[0.65rem] tracking-wider normal-case">({label})</span>
}

export function CreatorIntakeForm({
  copy,
  organizations,
}: {
  copy: CreatorIntakeSettings
  organizations: CreatorIntakeOrg[]
}) {
  const [state, action, pending] = useActionState(submitCreator, INITIAL)

  // Mount time → hidden field, the timing gate the action checks (see the
  // contact form for the reasoning). Left empty without JS; the honeypot
  // still applies.
  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  // Live three-genre cap. The server slices to three regardless; this just
  // disables the rest once three are ticked so the limit is visible.
  const [genres, setGenres] = useState<string[]>([])
  const atGenreMax = genres.length >= 3
  const toggleGenre = (genre: string, checked: boolean) =>
    setGenres((prev) => (checked ? [...prev, genre] : prev.filter((g) => g !== genre)))

  if (state.status === 'success') {
    return (
      <p role="status" className="border-primary text-foreground border-l-2 py-2 pl-4 text-sm">
        {copy.successMessage}
      </p>
    )
  }

  const errors = state.fieldErrors ?? {}
  const values = state.values

  return (
    <form action={action} encType="multipart/form-data" className="space-y-10" noValidate>
      {/* Honeypot + timing gate, mirroring the contact form. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={timingRef} type="hidden" name="t" />

      {/* — Who you are — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionYou}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="name" className={labelClass}>
            {copy.nameLabel}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            defaultValue={values?.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={fieldClass}
          />
          {errors.name && (
            <p id="name-error" className="text-destructive text-xs">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className={labelClass}>
            {copy.slugLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <input id="slug" name="slug" type="text" defaultValue={values?.slug} className={fieldClass} />
          <p className={hintClass}>{copy.slugHint}</p>
        </div>

        {organizations.length > 0 && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="studio" className={labelClass}>
                {copy.studioLabel}
                <Optional label={copy.optionalLabel} />
              </label>
              <select id="studio" name="studio" defaultValue="" className={cn(fieldClass, 'appearance-none')}>
                <option value="">—</option>
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-2">
              <legend className={labelClass}>
                {copy.orgsLabel}
                <Optional label={copy.optionalLabel} />
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {organizations.map((org) => (
                  <label key={org._id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="orgs" value={org._id} className="size-4 accent-[var(--primary)]" />
                    {org.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="space-y-1.5">
          <label htmlFor="location" className={labelClass}>
            {copy.locationLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <input id="location" name="location" type="text" defaultValue={values?.location} className={fieldClass} />
        </div>
      </fieldset>

      {/* — Your work — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionWork}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="bio" className={labelClass}>
            {copy.bioLabel}
          </label>
          <textarea
            id="bio"
            name="bio"
            required
            rows={5}
            maxLength={8000}
            defaultValue={values?.bio}
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
            className={cn(fieldClass, 'resize-y')}
          />
          {errors.bio && (
            <p id="bio-error" className="text-destructive text-xs">
              {errors.bio}
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className={labelClass}>
            {copy.formatsLabel}
            <Optional label={copy.optionalLabel} />
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMATS.map((format) => (
              <label key={format} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="formats" value={format} className="size-4 accent-[var(--primary)]" />
                {format}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={labelClass}>
            {copy.genresLabel}
            <Optional label={copy.optionalLabel} />
          </legend>
          <p className={hintClass}>{copy.genresHint}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GENRES.map((genre) => {
              const checked = genres.includes(genre)
              return (
                <label
                  key={genre}
                  className={cn('flex items-center gap-2 text-sm', !checked && atGenreMax && 'opacity-40')}
                >
                  <input
                    type="checkbox"
                    name="genres"
                    value={genre}
                    checked={checked}
                    disabled={!checked && atGenreMax}
                    onChange={(e) => toggleGenre(genre, e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {genre}
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={labelClass}>
            {copy.audienceLabel}
            <Optional label={copy.optionalLabel} />
          </legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="audience" value="" defaultChecked className="size-4 accent-[var(--primary)]" />
              {copy.audienceSkipLabel}
            </label>
            {MATURITY_RATINGS.map((rating) => (
              <label key={rating} className="flex items-start gap-2 text-sm">
                <input type="radio" name="audience" value={rating} className="mt-0.5 size-4 accent-[var(--primary)]" />
                <span>
                  <span className="font-semibold">{rating}</span>
                  <span className="text-muted-foreground"> — {MATURITY_DESCRIPTIONS[rating]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={labelClass}>
            {copy.collabLabel}
            <Optional label={copy.optionalLabel} />
          </legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="collab" value="yes" className="size-4 accent-[var(--primary)]" />
              {copy.collabYesLabel}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="collab" value="no" defaultChecked className="size-4 accent-[var(--primary)]" />
              {copy.collabNoLabel}
            </label>
          </div>
        </fieldset>
      </fieldset>

      {/* — Where to find you — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionFind}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="website" className={labelClass}>
            {copy.websiteLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <input id="website" name="website" type="text" defaultValue={values?.website} className={fieldClass} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="socials" className={labelClass}>
            {copy.socialsLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <textarea
            id="socials"
            name="socials"
            rows={3}
            defaultValue={values?.socials}
            className={cn(fieldClass, 'resize-y')}
          />
          <p className={hintClass}>{copy.socialsHint}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="works" className={labelClass}>
            {copy.worksLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <textarea
            id="works"
            name="works"
            rows={3}
            defaultValue={values?.works}
            className={cn(fieldClass, 'resize-y')}
          />
          <p className={hintClass}>{copy.worksHint}</p>
        </div>
      </fieldset>

      {/* — Pictures — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionPictures}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="photo" className={labelClass}>
            {copy.photoLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className={cn(fieldClass, 'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase file:text-primary')}
          />
          <p className={hintClass}>{copy.photoHint}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="photoAlt" className={labelClass}>
            {copy.photoAltLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <input id="photoAlt" name="photoAlt" type="text" defaultValue={values?.photoAlt} className={fieldClass} />
          <p className={hintClass}>{copy.photoAltHint}</p>
        </div>
      </fieldset>

      {/* — Permission — */}
      <fieldset className="space-y-5">
        <SectionHeading>{copy.sectionPermission}</SectionHeading>

        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            {copy.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={values?.email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={fieldClass}
          />
          <p className={hintClass}>{copy.emailHint}</p>
          {errors.email && (
            <p id="email-error" className="text-destructive text-xs">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="permission"
              value="yes"
              required
              aria-invalid={Boolean(errors.permission)}
              aria-describedby={errors.permission ? 'permission-error' : undefined}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>{copy.permissionStatement}</span>
          </label>
          {errors.permission && (
            <p id="permission-error" className="text-destructive text-xs">
              {errors.permission}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="anythingElse" className={labelClass}>
            {copy.anythingElseLabel}
            <Optional label={copy.optionalLabel} />
          </label>
          <textarea
            id="anythingElse"
            name="anythingElse"
            rows={3}
            defaultValue={values?.anythingElse}
            className={cn(fieldClass, 'resize-y')}
          />
        </div>
      </fieldset>

      {/* A save-level failure (not a field problem) the reader can retry. */}
      {state.status === 'error' && !state.fieldErrors && (
        <p role="alert" className="text-destructive text-sm">
          {state.message ?? copy.errorMessage}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="font-black tracking-wide uppercase">
        {copy.submitLabel}
      </Button>
    </form>
  )
}

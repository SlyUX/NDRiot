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
 * JavaScript. Two modes:
 *  - **New** — an empty form.
 *  - **Update** — the page loads a creator's current values into `initial`;
 *    the form prepopulates from them and carries a hidden `updateId`, so the
 *    action patches that profile's draft instead of creating one. The picker
 *    above sets the `?editing=<id>` param that drives the prepopulation.
 *
 * Organizations are a live list from Sanity (existing docs only); the form
 * never creates one, keeping every anonymous write a single creator draft.
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

/** The editable values used to prepopulate the form on an update. */
export interface CreatorIntakeInitial {
  updateId: string
  name: string
  slug: string
  location: string
  website: string
  bio: string
  socials: string
  works: { label: string; url: string }[]
  genres: string[]
  formats: string[]
  audience: string
  collab: boolean
  studioId: string | null
  orgIds: string[]
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

/**
 * Searchable profile picker for the update flow. Each match is a plain link to
 * ?editing=<id>, so selecting one just navigates and the server prepopulates —
 * and without JavaScript the full list still renders and is clickable. The
 * input filters client-side once hydrated.
 */
function CreatorSearchPicker({
  creators,
  copy,
}: {
  creators: CreatorIntakeOrg[]
  copy: CreatorIntakeSettings
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = q ? creators.filter((c) => c.name.toLowerCase().includes(q)) : creators

  return (
    <div className="space-y-2">
      <label htmlFor="creator-search" className={labelClass}>
        {copy.updatePrompt}
      </label>
      <input
        id="creator-search"
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
          matches.map((c) => (
            <li key={c._id}>
              <a
                href={`/join?editing=${encodeURIComponent(c._id)}`}
                className="hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 block px-3 py-2 text-sm focus-visible:outline-none"
              >
                {c.name}
              </a>
            </li>
          ))
        )}
      </ul>
      <p className={hintClass}>{copy.updateSkipHint}</p>
    </div>
  )
}

/**
 * Repeatable "platform name + URL" rows for a creator's work links. Submits
 * two parallel arrays (`workLabel`, `workUrl`) that the action zips by index.
 * Prepopulated from the loaded profile on an update; falls back to one empty
 * row. Without JS the rendered rows still submit — only add/remove need it.
 */
function WorkLinksField({
  copy,
  initial,
}: {
  copy: CreatorIntakeSettings
  initial?: { label: string; url: string }[]
}) {
  const [rows, setRows] = useState<{ label: string; url: string; key: number }[]>(() =>
    (initial && initial.length ? initial : [{ label: '', url: '' }]).map((r, i) => ({ ...r, key: i })),
  )

  // Key from the current max + 1 — unique without a render-time ref mutation.
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { label: '', url: '', key: prev.reduce((m, r) => Math.max(m, r.key), -1) + 1 },
    ])
  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  const update = (key: number, field: 'label' | 'url', value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  return (
    <fieldset className="space-y-3">
      <legend className={labelClass}>
        {copy.worksLabel}
        <Optional label={copy.optionalLabel} />
      </legend>
      <p className={hintClass}>{copy.worksHint}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="workLabel"
              value={row.label}
              onChange={(e) => update(row.key, 'label', e.target.value)}
              placeholder={copy.workPlatformPlaceholder}
              aria-label={copy.workPlatformPlaceholder}
              className={cn(fieldClass, 'sm:w-1/3')}
            />
            <div className="flex gap-2 sm:flex-1">
              <input
                type="url"
                name="workUrl"
                value={row.url}
                onChange={(e) => update(row.key, 'url', e.target.value)}
                placeholder={copy.workUrlPlaceholder}
                aria-label={copy.workUrlPlaceholder}
                className={cn(fieldClass, 'flex-1')}
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={copy.workRemoveLabel}
                  className="text-muted-foreground hover:text-destructive focus-visible:ring-ring shrink-0 px-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-primary focus-visible:ring-ring text-xs font-semibold tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
      >
        + {copy.workAddLabel}
      </button>
    </fieldset>
  )
}

export function CreatorIntakeForm({
  copy,
  organizations,
  creators,
  initial,
}: {
  copy: CreatorIntakeSettings
  organizations: CreatorIntakeOrg[]
  creators: CreatorIntakeOrg[]
  initial?: CreatorIntakeInitial
}) {
  const [state, action, pending] = useActionState(submitCreator, INITIAL)
  const editing = Boolean(initial)

  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  // Live three-genre cap; the server enforces it regardless. Seeded from the
  // loaded profile on an update.
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? [])
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
  // On a validation error, the echoed submission wins; otherwise the loaded
  // profile (update) or empty (new).
  const initialText = (
    field: keyof NonNullable<CreatorIntakeState['values']>,
    fromInitial?: string,
  ) => values?.[field] ?? fromInitial ?? ''

  return (
    <>
      {/* Update picker / editing banner. Selecting a profile navigates to
          ?editing=<id> and the server prepopulates. */}
      {creators.length > 0 && !editing && (
        <div className="border-primary/20 mb-10 border-b pb-8">
          <CreatorSearchPicker creators={creators} copy={copy} />
        </div>
      )}

      {editing && (
        <div className="border-primary/40 mb-10 border-l-2 py-2 pl-4">
          <p className="text-sm">{copy.editingNotice.replace('{name}', initial!.name)}</p>
          <a href="/join" className="text-primary mt-1 inline-block text-xs underline underline-offset-4">
            {copy.editingResetLabel}
          </a>
        </div>
      )}

      <form action={action} encType="multipart/form-data" className="space-y-10" noValidate>
        {/* Honeypot + timing gate, mirroring the contact form. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input ref={timingRef} type="hidden" name="t" />
        {/* Present only on an update — the action keys off it to patch the right
            profile's draft. */}
        {editing && <input type="hidden" name="updateId" value={initial!.updateId} />}

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
              defaultValue={initialText('name', initial?.name)}
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

          {/* Web address is fixed once a profile exists — hidden on update so it
              reads as unchangeable, which matches the action preserving it. */}
          {!editing && (
            <div className="space-y-1.5">
              <label htmlFor="slug" className={labelClass}>
                {copy.slugLabel}
                <Optional label={copy.optionalLabel} />
              </label>
              <input id="slug" name="slug" type="text" defaultValue={initialText('slug')} className={fieldClass} />
              <p className={hintClass}>{copy.slugHint}</p>
            </div>
          )}

          {organizations.length > 0 && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="studio" className={labelClass}>
                  {copy.studioLabel}
                  <Optional label={copy.optionalLabel} />
                </label>
                <select
                  id="studio"
                  name="studio"
                  defaultValue={initial?.studioId ?? ''}
                  className={cn(fieldClass, 'appearance-none')}
                >
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
                      <input
                        type="checkbox"
                        name="orgs"
                        value={org._id}
                        defaultChecked={initial?.orgIds.includes(org._id)}
                        className="size-4 accent-[var(--primary)]"
                      />
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
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={initialText('location', initial?.location)}
              className={fieldClass}
            />
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
              defaultValue={initialText('bio', initial?.bio)}
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
                  <input
                    type="checkbox"
                    name="formats"
                    value={format}
                    defaultChecked={initial?.formats.includes(format)}
                    className="size-4 accent-[var(--primary)]"
                  />
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
                <input
                  type="radio"
                  name="audience"
                  value=""
                  defaultChecked={!initial?.audience}
                  className="size-4 accent-[var(--primary)]"
                />
                {copy.audienceSkipLabel}
              </label>
              {MATURITY_RATINGS.map((rating) => (
                <label key={rating} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="audience"
                    value={rating}
                    defaultChecked={initial?.audience === rating}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
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
                <input
                  type="radio"
                  name="collab"
                  value="yes"
                  defaultChecked={initial?.collab === true}
                  className="size-4 accent-[var(--primary)]"
                />
                {copy.collabYesLabel}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="collab"
                  value="no"
                  defaultChecked={!initial?.collab}
                  className="size-4 accent-[var(--primary)]"
                />
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
            <input
              id="website"
              name="website"
              type="text"
              defaultValue={initialText('website', initial?.website)}
              className={fieldClass}
            />
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
              defaultValue={initialText('socials', initial?.socials)}
              className={cn(fieldClass, 'resize-y')}
            />
            <p className={hintClass}>{copy.socialsHint}</p>
          </div>

          <WorkLinksField copy={copy} initial={initial?.works} />
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
            <input
              id="photoAlt"
              name="photoAlt"
              type="text"
              defaultValue={initialText('photoAlt')}
              className={fieldClass}
            />
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
              defaultValue={initialText('email')}
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
              defaultValue={initialText('anythingElse')}
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

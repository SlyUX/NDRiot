'use client'

import Image from 'next/image'
import { useActionState, useEffect, useRef, useState } from 'react'

import { submitCreator, type CreatorIntakeState } from '@/app/actions/creator-intake'
import { Button } from '@/components/ui/button'
import { ALLOWED_IMAGE_TYPES, MAX_PICK_BYTES, downscaleImage } from '@/lib/intake/downscale'
import { slugify } from '@/lib/intake/mapping'
import {
  GENRES,
  FORMATS,
  SOCIAL_PLATFORMS,
  SOCIAL_PROFILE_PREFIX,
  type SocialPlatform,
} from '@/lib/taxonomy'
import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'
import type { CreatorIntakeSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'

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
  socials: { platform: string; url: string }[]
  works: { label: string; url: string }[]
  genres: string[]
  formats: string[]
  collab: boolean
  photo: SanityImage | null
  photoAlt: string
  studioId: string | null
  studioName: string
  studioWebsite: string
  studioLogo: SanityImage | null
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
 * Repeatable social rows: platform + account name. For a platform with a known
 * profile prefix the input is a handle, shown after a read-only prefix
 * adornment (e.g. "instagram.com/"), and the action stores prefix + handle; the
 * rest (Discord/Website/Other) take a full URL. Each dropdown offers only
 * platforms not already used by another row. Submits parallel
 * `socialPlatform` / `socialValue` arrays; prepopulated on an update.
 */
function SocialLinksField({
  copy,
  initial,
}: {
  copy: CreatorIntakeSettings
  initial?: { platform: string; url: string }[]
}) {
  // Stored socials hold a full URL; show just the handle where the platform has
  // a prefix, so editing stays account-name based.
  const toRow = (s: { platform: string; url: string }) => {
    const prefix = SOCIAL_PROFILE_PREFIX[s.platform as SocialPlatform]
    // Strip the prefix AND a trailing slash so the shown handle is clean.
    const value = prefix && s.url.startsWith(prefix)
      ? s.url.slice(prefix.length).replace(/\/+$/, '')
      : s.url
    return { platform: s.platform, value }
  }
  const [rows, setRows] = useState<{ platform: string; value: string; key: number }[]>(() =>
    (initial && initial.length ? initial.map(toRow) : [{ platform: '', value: '' }]).map((r, i) => ({
      ...r,
      key: i,
    })),
  )

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { platform: '', value: '', key: prev.reduce((m, r) => Math.max(m, r.key), -1) + 1 },
    ])
  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  const update = (key: number, field: 'platform' | 'value', value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  const used = new Set(rows.map((r) => r.platform).filter(Boolean))

  return (
    <fieldset className="space-y-3">
      <legend className={labelClass}>
        {copy.socialsLabel}
        <Optional label={copy.optionalLabel} />
      </legend>
      <p className={hintClass}>{copy.socialsHint}</p>
      <div className="space-y-2">
        {rows.map((row) => {
          const prefix = SOCIAL_PROFILE_PREFIX[row.platform as SocialPlatform]
          const shownPrefix = prefix ? prefix.replace(/^https?:\/\/(www\.)?/, '') : null
          return (
            <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
              <select
                name="socialPlatform"
                value={row.platform}
                onChange={(e) => update(row.key, 'platform', e.target.value)}
                aria-label={copy.socialPlatformPlaceholder}
                className={cn(fieldClass, 'appearance-none sm:w-1/3')}
              >
                <option value="">{copy.socialPlatformPlaceholder}</option>
                {SOCIAL_PLATFORMS.filter((p) => p === row.platform || !used.has(p)).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 sm:flex-1">
                {/* Prefix adornment + handle for known platforms; a bare URL
                    field for the rest. */}
                <div className="focus-within:ring-ring flex flex-1 items-center border border-white/20 focus-within:ring-2">
                  {shownPrefix && (
                    <span className="text-muted-foreground border-r border-white/20 px-2 py-2 text-sm whitespace-nowrap">
                      {shownPrefix}
                    </span>
                  )}
                  <input
                    type="text"
                    name="socialValue"
                    value={row.value}
                    onChange={(e) => update(row.key, 'value', e.target.value)}
                    placeholder={prefix ? copy.socialHandlePlaceholder : copy.workUrlPlaceholder}
                    aria-label={copy.socialsLabel}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
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
          )
        })}
      </div>
      {rows.length < SOCIAL_PLATFORMS.length && (
        <button
          type="button"
          onClick={addRow}
          className="text-primary focus-visible:ring-ring text-xs font-semibold tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
        >
          + {copy.workAddLabel}
        </button>
      )}
    </fieldset>
  )
}

/**
 * Repeatable "left text + right URL" rows. Submits two parallel arrays
 * (`leftName`, `rightName`) the action zips by index. Used for both a creator's
 * work links and adding an organization that isn't listed. Prepopulated from a
 * loaded profile where relevant; falls back to one empty row. Without JS the
 * rendered rows still submit — only add/remove need it.
 */
function PairedRowsField({
  legend,
  hint,
  optionalLabel,
  leftName,
  leftPlaceholder,
  rightName,
  rightPlaceholder,
  rightDefault = '',
  addLabel,
  removeLabel,
  initial,
}: {
  legend: string
  hint?: string
  optionalLabel: string
  leftName: string
  leftPlaceholder: string
  rightName: string
  rightPlaceholder: string
  /** Prefill for the right (URL) column of a blank row, e.g. "https://www.". */
  rightDefault?: string
  addLabel: string
  removeLabel: string
  initial?: { left: string; right: string }[]
}) {
  const [rows, setRows] = useState<{ left: string; right: string; key: number }[]>(() =>
    (initial && initial.length ? initial : [{ left: '', right: rightDefault }]).map((r, i) => ({
      ...r,
      key: i,
    })),
  )

  // Key from the current max + 1 — unique without a render-time ref mutation.
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { left: '', right: rightDefault, key: prev.reduce((m, r) => Math.max(m, r.key), -1) + 1 },
    ])
  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  const update = (key: number, field: 'left' | 'right', value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  return (
    <fieldset className="space-y-3">
      <legend className={labelClass}>
        {legend}
        <Optional label={optionalLabel} />
      </legend>
      {hint && <p className={hintClass}>{hint}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name={leftName}
              value={row.left}
              onChange={(e) => update(row.key, 'left', e.target.value)}
              placeholder={leftPlaceholder}
              aria-label={leftPlaceholder}
              className={cn(fieldClass, 'sm:w-1/3')}
            />
            <div className="flex gap-2 sm:flex-1">
              <input
                type="url"
                name={rightName}
                value={row.right}
                onChange={(e) => update(row.key, 'right', e.target.value)}
                placeholder={rightPlaceholder}
                aria-label={rightPlaceholder}
                className={cn(fieldClass, 'flex-1')}
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={removeLabel}
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
        + {addLabel}
      </button>
    </fieldset>
  )
}

export function CreatorIntakeForm({
  copy,
  organizations,
  collectives,
  creators,
  initial,
}: {
  copy: CreatorIntakeSettings
  /** All orgs — the studio dropdown. */
  organizations: CreatorIntakeOrg[]
  /** Orgs that are NOT used as a studio — the Collectives checkboxes. */
  collectives: CreatorIntakeOrg[]
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

  // Name + web address are controlled so the address can be suggested from the
  // name (create only) and constrained to URL-safe characters as typed. The
  // suggestion stops the moment the address is edited by hand. The server runs
  // the same slugify on submit, so this is a live preview of that, not a
  // second source of truth.
  const [name, setName] = useState(state.values?.name ?? initial?.name ?? '')
  const [slug, setSlug] = useState(state.values?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(state.values?.slug))
  const sanitizeSlug = (v: string) =>
    v
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
  const onNameChange = (v: string) => {
    setName(v)
    if (!editing && !slugTouched) setSlug(slugify(v))
  }
  const onSlugChange = (v: string) => {
    setSlug(sanitizeSlug(v))
    setSlugTouched(true)
  }

  // Validate a picked image (type + a hard size cap) with a visible message,
  // then downscale it in place so a smaller file is what submits. Keyed by
  // input name so the photo and studio-logo fields show their own error.
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  const onImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const name = input.name
    const file = input.files?.[0]
    setImageErrors((prev) => ({ ...prev, [name]: '' }))
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      input.value = ''
      setImageErrors((prev) => ({ ...prev, [name]: copy.imageTypeError }))
      return
    }
    if (file.size > MAX_PICK_BYTES) {
      input.value = ''
      setImageErrors((prev) => ({ ...prev, [name]: copy.imageSizeError }))
      return
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
          <a href="/join?new" className="text-primary mt-1 inline-block text-xs underline underline-offset-4">
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
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
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

          {/* The address is fixed once a profile exists — hidden on update so it
              reads as unchangeable, matching the action preserving it. Suggested
              from the name, and constrained to URL-safe characters as typed. */}
          {!editing && (
            <div className="space-y-1.5">
              <label htmlFor="slug" className={labelClass}>
                {copy.slugLabel}
                <Optional label={copy.optionalLabel} />
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
                onChange={(e) => onSlugChange(e.target.value)}
                className={fieldClass}
              />
              <p className={hintClass}>{copy.slugHint}</p>
            </div>
          )}

          {/* Studio: pick an existing one (create only), or enter your studio's
              name + URL + logo. On an update the fields prefill with your current
              studio so you can edit its website or logo. */}
          <fieldset className="space-y-3">
            <legend className={labelClass}>
              {copy.studioLabel}
              <Optional label={copy.optionalLabel} />
            </legend>
            {!editing && organizations.length > 0 && (
              <select
                id="studio"
                name="studio"
                defaultValue={initial?.studioId ?? ''}
                aria-label={copy.studioLabel}
                className={cn(fieldClass, 'appearance-none')}
              >
                <option value="">{copy.studioSelectPlaceholder}</option>
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            <div className="border-primary/20 space-y-2 border-l-2 pl-4">
              <p className={hintClass}>{copy.studioCreateLabel}</p>
              <input
                type="text"
                name="studioName"
                defaultValue={initial?.studioName ?? ''}
                placeholder={copy.studioNamePlaceholder}
                aria-label={copy.studioNamePlaceholder}
                className={fieldClass}
              />
              <input
                type="url"
                name="studioUrl"
                defaultValue={initial?.studioWebsite || 'https://www.'}
                placeholder={copy.studioUrlPlaceholder}
                aria-label={copy.studioUrlPlaceholder}
                className={fieldClass}
              />
              <div className="space-y-1.5 pt-1">
                <label htmlFor="studioLogo" className={labelClass}>
                  {copy.studioLogoLabel}
                </label>
                {/* Current studio logo on edit — object-contain, like the site,
                    so a non-square mark isn't cropped. */}
                {initial?.studioLogo && (
                  <div className="mb-2 flex items-center gap-3">
                    <Image
                      src={urlFor(initial.studioLogo).width(128).url()}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 shrink-0 object-contain"
                    />
                    <p className={hintClass}>{copy.photoCurrentHint}</p>
                  </div>
                )}
                <input
                  id="studioLogo"
                  name="studioLogo"
                  type="file"
                  accept="image/*"
                  onChange={onImagePick}
                  className={cn(fieldClass, 'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase file:text-primary')}
                />
                {imageErrors.studioLogo && (
                  <p className="text-destructive text-xs">{imageErrors.studioLogo}</p>
                )}
                <p className={hintClass}>{copy.studioLogoHint}</p>
              </div>
            </div>
          </fieldset>

          {/* Collectives excludes studios (orgs used as someone's studio), so a
              trading name doesn't show up as a group to join. */}
          {collectives.length > 0 && (
            <fieldset className="space-y-2">
              <legend className={labelClass}>
                {copy.orgsLabel}
                <Optional label={copy.optionalLabel} />
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {collectives.map((org) => (
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
          )}

          {/* Not listed? Add an org by name + URL. The action reuses one that
              already matches by name, or creates it. */}
          <PairedRowsField
            legend={copy.orgAddLabel}
            hint={copy.orgAddHint}
            optionalLabel={copy.optionalLabel}
            leftName="newOrgName"
            leftPlaceholder={copy.orgNamePlaceholder}
            rightName="newOrgUrl"
            rightPlaceholder={copy.workUrlPlaceholder}
            rightDefault="https://www."
            addLabel={copy.workAddLabel}
            removeLabel={copy.workRemoveLabel}
          />

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
              type="url"
              defaultValue={initialText('website', initial?.website) || 'https://www.'}
              className={fieldClass}
            />
          </div>

          <SocialLinksField copy={copy} initial={initial?.socials} />

          <PairedRowsField
            legend={copy.worksLabel}
            hint={copy.worksHint}
            optionalLabel={copy.optionalLabel}
            leftName="workLabel"
            leftPlaceholder={copy.workPlatformPlaceholder}
            rightName="workUrl"
            rightPlaceholder={copy.workUrlPlaceholder}
            rightDefault="https://www."
            addLabel={copy.workAddLabel}
            removeLabel={copy.workRemoveLabel}
            initial={initial?.works.map((w) => ({ left: w.label, right: w.url }))}
          />
        </fieldset>

        {/* — Pictures — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionPictures}</SectionHeading>

          <div className="space-y-1.5">
            <label htmlFor="photo" className={labelClass}>
              {copy.photoLabel}
              <Optional label={copy.optionalLabel} />
            </label>
            {/* On an update, show the existing avatar so the creator knows a
                re-upload is optional. alt is their own image's alt, or empty
                (decorative) — the note beside it carries the meaning. */}
            {initial?.photo && (
              <div className="mb-2 flex items-center gap-3">
                <Image
                  src={urlFor(initial.photo).width(128).height(128).fit('crop').url()}
                  alt={initial.photoAlt || ''}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 object-cover"
                />
                <p className={hintClass}>{copy.photoCurrentHint}</p>
              </div>
            )}
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={onImagePick}
              className={cn(fieldClass, 'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase file:text-primary')}
            />
            {imageErrors.photo && <p className="text-destructive text-xs">{imageErrors.photo}</p>}
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
              defaultValue={initialText('photoAlt', initial?.photoAlt)}
              className={fieldClass}
            />
            <p className={hintClass}>{copy.photoAltHint}</p>
          </div>
        </fieldset>

        {/* — Permission — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionPermission}</SectionHeading>

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

'use client'

import Image from 'next/image'
import { useActionState, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { submitBook, type BookIntakeState } from '@/app/actions/book-intake'
import { PairedRowsField } from '@/components/paired-rows-field'
import { Button } from '@/components/ui/button'
import { ALLOWED_IMAGE_TYPES, MAX_PICK_BYTES, downscaleImage } from '@/lib/intake/downscale'
import { slugify } from '@/lib/intake/mapping'
import {
  GENRES,
  FORMATS,
  LINK_KINDS,
  MATURITY_RATINGS,
  MATURITY_DESCRIPTIONS,
  SINGLE_VOLUME_FORMATS,
  STATUSES,
  linkKindForHost,
} from '@/lib/taxonomy'
import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'
import type { BookIntakeSettings, CreatorIntakeSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'

/**
 * On-site book intake. Presentational: book-specific copy comes in as `copy`;
 * the generic strings shared with the creator form (sign-in button, add/remove,
 * URL placeholder, image errors, current-image hint) come in as `common` so
 * they aren't duplicated in Sanity. The write lives in the `submitBook` action.
 *
 * Same shape as the creator form: plain multipart <form action={…}> that works
 * without JS, with a searchable picker for editing an existing book. The creator
 * dropdown is scoped to creators the signed-in user owns.
 */

const INITIAL: BookIntakeState = { status: 'idle' }

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none aria-[invalid=true]:border-destructive'
const labelClass = 'block text-xs tracking-widest uppercase'
// Helper text is meant to be read, so it takes the full foreground (not muted).
const hintClass = 'text-foreground text-xs'

export interface BookPickerItem {
  _id: string
  title: string
  creatorName: string | null
}

export interface OwnedCreator {
  _id: string
  name: string
}

export interface BookIntakeInitial {
  updateId: string
  title: string
  slug: string
  creatorId: string | null
  genres: string[]
  format: string
  maturity: string
  status: string
  issueCount: string
  shortDescription: string
  description: string
  cover: SanityImage | null
  coverAlt: string
  previewUrl: string
  links: { kind: string; label: string; url: string; endDate: string }[]
  videos: { left: string; right: string }[]
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

/** Searchable picker of the user's own books; each match links to ?editing=id. */
function BookPicker({ books, copy }: { books: BookPickerItem[]; copy: BookIntakeSettings }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = q ? books.filter((b) => b.title.toLowerCase().includes(q)) : books
  return (
    <div className="space-y-2">
      <label htmlFor="book-search" className={labelClass}>
        {copy.updatePrompt}
      </label>
      <input
        id="book-search"
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
          matches.map((b) => (
            <li key={b._id}>
              <a
                href={`/join/books?editing=${encodeURIComponent(b._id)}`}
                className="hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 block px-3 py-2 text-sm focus-visible:outline-none"
              >
                {b.title}
                {b.creatorName && <span className="text-muted-foreground"> · {b.creatorName}</span>}
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
 * Repeatable link rows: kind + label + URL (+ end date when kind is Back). The
 * kind is auto-suggested from the URL's host but editable. Submits parallel
 * linkKind / linkLabel / linkUrl / linkEndDate arrays the action zips; the end
 * date input is always present (hidden off-Back) so the arrays stay aligned.
 */
function BookLinksField({
  copy,
  common,
  initial,
}: {
  copy: BookIntakeSettings
  common: CreatorIntakeSettings
  initial?: { kind: string; label: string; url: string; endDate: string }[]
}) {
  const [rows, setRows] = useState<
    { kind: string; label: string; url: string; endDate: string; key: number }[]
  >(() =>
    (initial && initial.length ? initial : [{ kind: '', label: '', url: 'https://www.', endDate: '' }]).map(
      (r, i) => ({ ...r, key: i }),
    ),
  )
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        kind: '',
        label: '',
        url: 'https://www.',
        endDate: '',
        key: prev.reduce((m, r) => Math.max(m, r.key), -1) + 1,
      },
    ])
  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  const update = (key: number, field: 'kind' | 'label' | 'url' | 'endDate', value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  const onUrl = (key: number, url: string) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        // Suggest the kind from the host, only when the creator hasn't set one.
        const kind = r.kind || linkKindForHost(url) || r.kind
        return { ...r, url, kind }
      }),
    )

  return (
    <fieldset className="space-y-3">
      <legend className={labelClass}>
        {copy.linksLabel}
        <Optional label={common.optionalLabel} />
      </legend>
      <p className={hintClass}>{copy.linksHint}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="space-y-2 border-l border-white/10 pl-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                name="linkKind"
                value={row.kind}
                onChange={(e) => update(row.key, 'kind', e.target.value)}
                aria-label={copy.linkKindPlaceholder}
                className={cn(fieldClass, 'appearance-none sm:w-40')}
              >
                <option value="">{copy.linkKindPlaceholder}</option>
                {LINK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="linkLabel"
                value={row.label}
                onChange={(e) => update(row.key, 'label', e.target.value)}
                placeholder={copy.linkLabelPlaceholder}
                aria-label={copy.linkLabelPlaceholder}
                className={cn(fieldClass, 'sm:w-1/3')}
              />
              <div className="flex gap-2 sm:flex-1">
                <input
                  type="url"
                  name="linkUrl"
                  value={row.url}
                  onChange={(e) => onUrl(row.key, e.target.value)}
                  placeholder={common.workUrlPlaceholder}
                  aria-label={copy.linksLabel}
                  className={cn(fieldClass, 'flex-1')}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label={common.workRemoveLabel}
                    className="text-muted-foreground hover:text-primary focus-visible:ring-ring shrink-0 px-2 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {/* Always present so the parallel arrays align; a real date field for
                Back, hidden otherwise. */}
            {row.kind === 'Back' ? (
              <label className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground tracking-widest uppercase">
                  {copy.linkEndDateLabel}
                </span>
                <input
                  type="date"
                  name="linkEndDate"
                  value={row.endDate}
                  onChange={(e) => update(row.key, 'endDate', e.target.value)}
                  className={cn(fieldClass, 'sm:w-auto')}
                />
              </label>
            ) : (
              <input type="hidden" name="linkEndDate" value={row.endDate} />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-primary focus-visible:ring-ring text-xs font-semibold tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
      >
        + {common.workAddLabel}
      </button>
    </fieldset>
  )
}

export function BookIntakeForm({
  copy,
  common,
  creators,
  books,
  initial,
}: {
  copy: BookIntakeSettings
  common: CreatorIntakeSettings
  creators: OwnedCreator[]
  books: BookPickerItem[]
  initial?: BookIntakeInitial
}) {
  const [state, action, pending] = useActionState(submitBook, INITIAL)
  const editing = Boolean(initial)

  const timingRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(Date.now())
  }, [])

  // Title + address: address auto-suggested from title (create only), URL-safe.
  const [title, setTitle] = useState(state.values?.title ?? initial?.title ?? '')
  const [slug, setSlug] = useState(state.values?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(state.values?.slug))
  const sanitizeSlug = (v: string) =>
    v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-')
  const onTitle = (v: string) => {
    setTitle(v)
    if (!editing && !slugTouched) setSlug(slugify(v))
  }

  const [genres, setGenres] = useState<string[]>(initial?.genres ?? [])
  const atGenreMax = genres.length >= 3
  const toggleGenre = (g: string, checked: boolean) =>
    setGenres((prev) => (checked ? [...prev, g] : prev.filter((x) => x !== g)))

  // Format controls whether "issues available" is shown.
  const [format, setFormat] = useState(initial?.format ?? '')
  const showIssues = Boolean(format) && !(SINGLE_VOLUME_FORMATS as readonly string[]).includes(format)

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
  const text = (field: keyof NonNullable<BookIntakeState['values']>, fromInitial?: string) =>
    values?.[field] ?? fromInitial ?? ''

  return (
    <>
      {books.length > 0 && !editing && (
        <div className="border-primary/20 mb-10 border-b pb-8">
          <BookPicker books={books} copy={copy} />
        </div>
      )}

      {editing && (
        <div className="border-primary/40 mb-10 border-l-2 py-2 pl-4">
          <p className="text-sm">{copy.editingNotice.replace('{name}', initial!.title)}</p>
          <a href="/join/books?new" className="text-primary mt-1 inline-block text-xs underline underline-offset-4">
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
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className={fieldClass}
            />
            {errors.title && (
              <p id="title-error" className="text-destructive text-xs">
                {errors.title}
              </p>
            )}
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

          <div className="space-y-1.5">
            <label htmlFor="creator" className={labelClass}>
              {copy.creatorLabel}
            </label>
            <select
              id="creator"
              name="creator"
              required
              defaultValue={initial?.creatorId ?? (creators.length === 1 ? creators[0]._id : '')}
              aria-invalid={Boolean(errors.creator)}
              className={cn(fieldClass, 'appearance-none')}
            >
              <option value="">—</option>
              {creators.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className={hintClass}>{copy.creatorHint}</p>
            {errors.creator && (
              <p className="text-destructive text-xs">{errors.creator}</p>
            )}
          </div>
        </fieldset>

        {/* — Classification — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionClassification}</SectionHeading>

          <div className="space-y-1.5">
            <label htmlFor="format" className={labelClass}>
              {copy.formatLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <select
              id="format"
              name="format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className={cn(fieldClass, 'appearance-none')}
            >
              <option value="">—</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClass}>
              {copy.genresLabel}
              <Optional label={common.optionalLabel} />
            </legend>
            <p className={hintClass}>{copy.genresHint}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GENRES.map((g) => {
                const checked = genres.includes(g)
                return (
                  <label
                    key={g}
                    className={cn('flex items-center gap-2 text-sm', !checked && atGenreMax && 'opacity-40')}
                  >
                    <input
                      type="checkbox"
                      name="genres"
                      value={g}
                      checked={checked}
                      disabled={!checked && atGenreMax}
                      onChange={(e) => toggleGenre(g, e.target.checked)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {g}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelClass}>
              {copy.maturityLabel}
              <Optional label={common.optionalLabel} />
            </legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="maturity"
                  value=""
                  defaultChecked={!initial?.maturity}
                  className="size-4 accent-[var(--primary)]"
                />
                {copy.maturitySkipLabel}
              </label>
              {MATURITY_RATINGS.map((m) => (
                <label key={m} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="maturity"
                    value={m}
                    defaultChecked={initial?.maturity === m}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="font-semibold">{m}</span>
                    <span className="text-muted-foreground"> — {MATURITY_DESCRIPTIONS[m]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelClass}>
              {copy.statusLabel}
              <Optional label={common.optionalLabel} />
            </legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="status"
                  value=""
                  defaultChecked={!initial?.status}
                  className="size-4 accent-[var(--primary)]"
                />
                {copy.statusSkipLabel}
              </label>
              {STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    defaultChecked={initial?.status === s}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>

          {showIssues && (
            <div className="space-y-1.5">
              <label htmlFor="issueCount" className={labelClass}>
                {copy.issueCountLabel}
                <Optional label={common.optionalLabel} />
              </label>
              <input
                id="issueCount"
                name="issueCount"
                type="number"
                min={1}
                step={1}
                defaultValue={text('issueCount', initial?.issueCount)}
                className={cn(fieldClass, 'sm:w-32')}
              />
              <p className={hintClass}>{copy.issueCountHint}</p>
            </div>
          )}
        </fieldset>

        {/* — Words — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionWords}</SectionHeading>

          <div className="space-y-1.5">
            <label htmlFor="shortDescription" className={labelClass}>
              {copy.shortDescLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={2}
              maxLength={400}
              defaultValue={text('shortDescription', initial?.shortDescription)}
              className={cn(fieldClass, 'resize-y')}
            />
            <p className={hintClass}>{copy.shortDescHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className={labelClass}>
              {copy.fullDescLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              maxLength={20000}
              defaultValue={text('description', initial?.description)}
              className={cn(fieldClass, 'resize-y')}
            />
            <p className={hintClass}>{copy.fullDescHint}</p>
          </div>
        </fieldset>

        {/* — Cover — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionCover}</SectionHeading>

          <div className="space-y-1.5">
            <label htmlFor="cover" className={labelClass}>
              {copy.coverLabel}
              <Optional label={common.optionalLabel} />
            </label>
            {initial?.cover && (
              <div className="mb-2 flex items-center gap-3">
                <Image
                  src={urlFor(initial.cover).width(160).url()}
                  alt=""
                  width={64}
                  height={96}
                  className="h-24 w-16 shrink-0 object-cover"
                />
                <p className={hintClass}>{common.photoCurrentHint}</p>
              </div>
            )}
            <input
              id="cover"
              name="cover"
              type="file"
              accept="image/*"
              onChange={onImagePick}
              className={cn(fieldClass, 'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:uppercase file:text-primary')}
            />
            {imageError && <p className="text-destructive text-xs">{imageError}</p>}
            <p className={hintClass}>{copy.coverHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="coverAlt" className={labelClass}>
              {copy.coverAltLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <input
              id="coverAlt"
              name="coverAlt"
              type="text"
              defaultValue={text('coverAlt', initial?.coverAlt)}
              className={fieldClass}
            />
            <p className={hintClass}>{copy.coverAltHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="previewUrl" className={labelClass}>
              {copy.previewUrlLabel}
              <Optional label={common.optionalLabel} />
            </label>
            <input
              id="previewUrl"
              name="previewUrl"
              type="url"
              defaultValue={text('previewUrl', initial?.previewUrl) || 'https://www.'}
              className={fieldClass}
            />
            <p className={hintClass}>{copy.previewUrlHint}</p>
          </div>
        </fieldset>

        {/* — Where to find it — */}
        <fieldset className="space-y-5">
          <SectionHeading>{copy.sectionFind}</SectionHeading>
          <BookLinksField copy={copy} common={common} initial={initial?.links} />
        </fieldset>

        {/* Videos — optional (YouTube trailers/interviews/readings). Collapsed by
            default so it never clutters the required fields; label + URL per row,
            shown as lightbox thumbnails on the comic's page. Opens automatically
            when editing a comic that already has some. */}
        <details
          className="group border-border border"
          open={(initial?.videos?.length ?? 0) > 0}
        >
          <summary className="text-primary flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-black tracking-widest uppercase">
            {copy.videosLabel}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="border-border border-t p-4">
            <PairedRowsField
              legend={copy.videosLabel}
              hideLegend
              hint={copy.videosHint}
              optionalLabel={common.optionalLabel}
              leftName="videoTitle"
              leftPlaceholder={copy.videoTitlePlaceholder}
              rightName="videoUrl"
              rightPlaceholder={copy.videoUrlPlaceholder}
              rightDefault="https://"
              addLabel={copy.videoAddLabel}
              removeLabel={common.workRemoveLabel}
              initial={initial?.videos}
            />
          </div>
        </details>

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
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>{copy.permissionStatement}</span>
            </label>
            {errors.permission && <p className="text-destructive text-xs">{errors.permission}</p>}
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

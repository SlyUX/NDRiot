'use server'

import {
  GENRES,
  FORMATS,
  LINK_KINDS,
  MATURITY_RATINGS,
  SINGLE_VOLUME_FORMATS,
  STATUSES,
} from '@/lib/taxonomy'
import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import {
  buildLinks,
  isYes,
  matchTaxonomy,
  normalizeUrl,
  slugify,
  toPortableText,
} from '@/lib/intake/mapping'
import { uploadImageFile } from '@/lib/intake/uploads'
import { INTAKE_BOOK_IDS_QUERY } from '@/lib/queries'
import { auth } from '@/auth'
import { creatorsOwnedBy } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'

/**
 * Book intake — the same Stage-3 model as the creator form (see
 * docs/form-standards.md). Writes a single book **review draft**; a human
 * publishes. Google sign-in required.
 *
 * Ownership is INHERITED: a book is gated by whether the signed-in email owns
 * its **creator** (books aren't in the ownership map — the creator is). The
 * creator dropdown is scoped to owned creators, and both the chosen creator and
 * (on an update) the book's existing creator are re-checked here, fail-closed.
 *
 * Two modes: new → `drafts.book-<slug>`; update → seed from the published book
 * and patch supplied fields, preserving the slug (the URL).
 */

type FieldName = 'title' | 'creator' | 'permission'

export type BookIntakeState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<FieldName, string>>
  values?: {
    title: string
    slug: string
    issueCount: string
    shortDescription: string
    description: string
    coverAlt: string
    previewUrl: string
    anythingElse: string
  }
}

const LIMITS = { title: 200, short: 400, description: 20000 }
const CREATOR_REPLY_TO = 'submission@ndriot.com'

/** A `book-<slug>` id nobody holds yet — published or draft. */
function uniqueSlug(base: string, takenIds: Set<string>): string {
  const root = base || 'book'
  let slug = root
  let n = 1
  while (takenIds.has(`book-${slug}`)) {
    n += 1
    slug = `${root}-${n}`
  }
  return slug
}

export async function submitBook(
  _prev: BookIntakeState,
  formData: FormData,
): Promise<BookIntakeState> {
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const values = {
    title: String(formData.get('title') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim(),
    issueCount: String(formData.get('issueCount') ?? '').trim(),
    shortDescription: String(formData.get('shortDescription') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    coverAlt: String(formData.get('coverAlt') ?? '').trim(),
    previewUrl: String(formData.get('previewUrl') ?? '').trim(),
    anythingElse: String(formData.get('anythingElse') ?? '').trim(),
  }

  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) {
    return { status: 'error', message: 'Your session expired — please sign in again.', values }
  }

  const fieldErrors: NonNullable<BookIntakeState['fieldErrors']> = {}
  if (!values.title) fieldErrors.title = 'Please add the book’s title.'
  else if (values.title.length > LIMITS.title) fieldErrors.title = 'That title is very long — please shorten it.'
  if (!isYes(String(formData.get('permission') ?? '')))
    fieldErrors.permission = 'We can only list work you confirm you have the right to share.'

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors, values }
  }

  if (await rateLimited('book-intake')) {
    return { status: 'error', message: 'Too many submissions just now. Give it a few minutes.', values }
  }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    console.error('[book-intake] write client unavailable', cause)
    return { status: 'error', message: 'On-site submissions are temporarily unavailable — please try again shortly.', values }
  }

  // Which creators may this email attach a book to?
  const ownedCreatorIds = new Set(await creatorsOwnedBy(email))
  if (ownedCreatorIds.size === 0) {
    return {
      status: 'error',
      message: 'Add a creator profile before adding a book — a book needs a creator.',
      values,
    }
  }

  // Update target: the book must exist and belong to a creator this email owns.
  const submittedUpdateId = String(formData.get('updateId') ?? '').trim()
  let target: { _id: string; slug?: string; creatorId?: string } | null = null
  if (submittedUpdateId) {
    try {
      target = await client.fetch<typeof target>(
        `*[_type=="book" && _id==$id][0]{_id,"slug":slug.current,"creatorId":creator._ref}`,
        { id: submittedUpdateId },
      )
    } catch (cause) {
      console.error('[book-intake] update target read failed', cause)
    }
  }
  const isUpdate = Boolean(target)
  if (isUpdate && !(target!.creatorId && ownedCreatorIds.has(target!.creatorId))) {
    return { status: 'error', message: 'You can only edit a book under a creator you own.', values }
  }

  // The creator this book is (re)assigned to must be one you own.
  const submittedCreator = String(formData.get('creator') ?? '').trim()
  const creatorId = ownedCreatorIds.has(submittedCreator)
    ? submittedCreator
    : isUpdate
      ? target!.creatorId ?? null
      : null
  if (!creatorId) {
    return { status: 'error', fieldErrors: { creator: 'Please choose one of your creators.' }, values }
  }

  let takenIds: Set<string>
  try {
    const bookIds = await client.fetch<string[]>(INTAKE_BOOK_IDS_QUERY)
    takenIds = new Set((bookIds ?? []).map((id) => id.replace(/^drafts\./, '')))
  } catch (cause) {
    console.error('[book-intake] book-id read failed', cause)
    return { status: 'error', message: 'Something went wrong — please try again.', values }
  }

  const genres = matchTaxonomy(formData.getAll('genres').map(String), GENRES).matched.slice(0, 3)
  const format = matchTaxonomy(String(formData.get('format') ?? ''), FORMATS, { single: true }).matched[0]
  const maturity = matchTaxonomy(String(formData.get('maturity') ?? ''), MATURITY_RATINGS, {
    single: true,
  }).matched[0]
  const status = matchTaxonomy(String(formData.get('status') ?? ''), STATUSES, { single: true }).matched[0]

  // Issue count only for a serialised format, and only a positive integer.
  let issueCount: number | undefined
  if (format && !(SINGLE_VOLUME_FORMATS as readonly string[]).includes(format)) {
    const n = Number.parseInt(values.issueCount, 10)
    if (Number.isInteger(n) && n > 0) issueCount = n
  }

  const links = buildLinks(
    formData.getAll('linkKind').map(String),
    formData.getAll('linkLabel').map(String),
    formData.getAll('linkUrl').map(String),
    formData.getAll('linkEndDate').map(String),
    LINK_KINDS,
  )

  const previewUrl = normalizeUrl(values.previewUrl)

  const slug = isUpdate
    ? (target!.slug ?? uniqueSlug(slugify(values.title), takenIds))
    : uniqueSlug(slugify(values.slug || values.title), takenIds)
  const targetId = isUpdate ? target!._id : `book-${slug}`

  // Cover (optional, non-fatal).
  let coverAssetId: string | null = null
  let coverNote: string | null = null
  const cover = formData.get('cover')
  if (cover instanceof File && cover.size > 0) {
    const result = await uploadImageFile(cover, `${slug}-cover`)
    if ('assetId' in result) coverAssetId = result.assetId
    else coverNote = result.error
  }

  // Editable fields — each set only when it has a value, so a blank never wipes
  // a filled field on update. Slug (the URL) is preserved on update; title and
  // creator can change.
  const fields: Record<string, unknown> = {
    title: values.title,
    creator: { _type: 'reference', _ref: creatorId },
  }
  if (genres.length) fields.genres = genres
  if (format) fields.format = format
  if (maturity) fields.maturity = maturity
  if (status) fields.status = status
  if (issueCount !== undefined) fields.issueCount = issueCount
  if (values.shortDescription) fields.shortDescription = values.shortDescription.slice(0, LIMITS.short)
  if (values.description) fields.description = toPortableText(values.description)
  if (links.length) fields.links = links
  if (previewUrl) fields.previewUrl = previewUrl
  if (coverAssetId) {
    fields.cover = {
      _type: 'imageWithAlt',
      asset: { _type: 'reference', _ref: coverAssetId },
      alt: values.coverAlt || undefined,
    }
  }

  const draftId = `drafts.${targetId}`
  try {
    if (isUpdate) {
      const published = await client.fetch<Record<string, unknown> | null>(`*[_id==$id][0]`, {
        id: targetId,
      })
      const seed: Record<string, unknown> = published
        ? { ...published, _id: draftId }
        : { _id: draftId, _type: 'book', slug: { _type: 'slug', current: slug } }
      delete seed._rev
      delete seed._createdAt
      delete seed._updatedAt
      await client
        .transaction()
        .createIfNotExists(seed as { _id: string; _type: string })
        .patch(draftId, (p) => p.set(fields))
        .commit()
    } else {
      await client.create({
        _id: draftId,
        _type: 'book',
        slug: { _type: 'slug', current: slug },
        ...fields,
      })
    }
  } catch (cause) {
    console.error('[book-intake] draft write failed', cause)
    return { status: 'error', message: 'Something went wrong saving your submission — please try again.', values }
  }

  await Promise.all([
    notifyTeam({ title: values.title, email, slug, isUpdate, note: values.anythingElse, coverNote }),
    notifyCreator({ email, isUpdate }),
  ])

  return { status: 'success' }
}

/** Best-effort team notification — arrival signal + consent record. */
async function notifyTeam(input: {
  title: string
  email: string
  slug: string
  isUpdate: boolean
  note: string
  coverNote: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) return

  const lines = [
    input.isUpdate ? `Book update: ${input.title}` : `New book: ${input.title}`,
    `Review + publish in the Studio (draft id: drafts.book-${input.slug}).`,
    ``,
    `Submitted by (consent on file, not stored in Sanity): ${input.email}`,
  ]
  if (input.note) lines.push(``, `They added:`, input.note)
  if (input.coverNote) lines.push(``, `Heads up: the cover didn’t upload — ${input.coverNote}`)

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[ND Riot] ${input.isUpdate ? 'Book update' : 'New book'}: ${input.title}`,
        text: lines.join('\n'),
      }),
    })
  } catch (cause) {
    console.error('[book-intake] team notification failed', cause)
  }
}

/** Confirmation to the submitter. */
async function notifyCreator(input: { email: string; isUpdate: boolean }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  if (!apiKey || !from) return

  const subject = input.isUpdate
    ? 'An update to your comic has been submitted to NDRiot.com'
    : 'Your comic has been submitted to NDRiot.com'
  const text = [
    input.isUpdate ? 'Thanks — your update has been received.' : 'Thanks for submitting your comic to ND Riot.',
    '',
    'A person reviews every submission before it goes live, so it’ll appear shortly. We’ll be in touch if anything needs a look.',
    '',
    '— ND Riot',
  ].join('\n')

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [input.email], reply_to: CREATOR_REPLY_TO, subject, text }),
    })
  } catch (cause) {
    console.error('[book-intake] creator confirmation failed', cause)
  }
}

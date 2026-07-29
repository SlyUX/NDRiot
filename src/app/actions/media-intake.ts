'use server'

import { GENRES, MEDIA_KINDS } from '@/lib/taxonomy'
import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import { buildMediaLinks, isYes, matchTaxonomy, slugify } from '@/lib/intake/mapping'
import { uploadImageFile } from '@/lib/intake/uploads'
import { INTAKE_MEDIA_IDS_QUERY } from '@/lib/queries'
import { auth } from '@/auth'
import { ownsDoc, recordOwnership } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'

/**
 * Media intake — same Stage-3 model as the creator/book forms (see
 * docs/form-standards.md). Writes a single `media` review draft; a human
 * publishes. Google sign-in required. A media outlet self-registers and owns
 * its own record (recorded on create, re-checked fail-closed on edit).
 */

type FieldName = 'name' | 'kind' | 'permission'

export type MediaIntakeState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<FieldName, string>>
  values?: {
    name: string
    slug: string
    about: string
    pitchInfo: string
    logoAlt: string
    anythingElse: string
  }
}

const LIMITS = { name: 150, about: 2000, pitch: 2000 }
const REPLY_TO = 'submission@ndriot.com'

function uniqueSlug(base: string, takenIds: Set<string>): string {
  const root = base || 'media'
  let slug = root
  let n = 1
  while (takenIds.has(`media-${slug}`)) {
    n += 1
    slug = `${root}-${n}`
  }
  return slug
}

export async function submitMedia(
  _prev: MediaIntakeState,
  formData: FormData,
): Promise<MediaIntakeState> {
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const values = {
    name: String(formData.get('name') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim(),
    about: String(formData.get('about') ?? '').trim(),
    pitchInfo: String(formData.get('pitchInfo') ?? '').trim(),
    logoAlt: String(formData.get('logoAlt') ?? '').trim(),
    anythingElse: String(formData.get('anythingElse') ?? '').trim(),
  }

  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) {
    return { status: 'error', message: 'Your session expired — please sign in again.', values }
  }

  const kind = matchTaxonomy(String(formData.get('kind') ?? ''), MEDIA_KINDS, { single: true }).matched[0]

  const fieldErrors: NonNullable<MediaIntakeState['fieldErrors']> = {}
  if (!values.name) fieldErrors.name = 'Please add the outlet’s name.'
  else if (values.name.length > LIMITS.name) fieldErrors.name = 'That name is very long — please shorten it.'
  if (!kind) fieldErrors.kind = 'Please choose what kind of media this is.'
  if (!isYes(String(formData.get('permission') ?? '')))
    fieldErrors.permission = 'Please confirm you represent this outlet and consent to being listed.'

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors, values }
  }

  if (await rateLimited('media-intake')) {
    return { status: 'error', message: 'Too many submissions just now. Give it a few minutes.', values }
  }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    console.error('[media-intake] write client unavailable', cause)
    return { status: 'error', message: 'On-site submissions are temporarily unavailable — please try again shortly.', values }
  }

  // Update target: must exist and be owned by this email.
  const submittedUpdateId = String(formData.get('updateId') ?? '').trim()
  let target: { _id: string; slug?: string } | null = null
  if (submittedUpdateId) {
    try {
      target = await client.fetch<typeof target>(
        `*[_type=="media" && _id==$id][0]{_id,"slug":slug.current}`,
        { id: submittedUpdateId },
      )
    } catch (cause) {
      console.error('[media-intake] update target read failed', cause)
    }
  }
  const isUpdate = Boolean(target)
  if (isUpdate && !(await ownsDoc(email, target!._id))) {
    return { status: 'error', message: 'You can only edit a listing you own.', values }
  }

  let takenIds: Set<string>
  try {
    const ids = await client.fetch<string[]>(INTAKE_MEDIA_IDS_QUERY)
    takenIds = new Set((ids ?? []).map((id) => id.replace(/^drafts\./, '')))
  } catch (cause) {
    console.error('[media-intake] id read failed', cause)
    return { status: 'error', message: 'Something went wrong — please try again.', values }
  }

  const genresCovered = matchTaxonomy(formData.getAll('genresCovered').map(String), GENRES).matched
  const links = buildMediaLinks(
    formData.getAll('linkLabel').map(String),
    formData.getAll('linkUrl').map(String),
  )

  const slug = isUpdate
    ? (target!.slug ?? uniqueSlug(slugify(values.name), takenIds))
    : uniqueSlug(slugify(values.slug || values.name), takenIds)
  const targetId = isUpdate ? target!._id : `media-${slug}`

  // Logo (optional, non-fatal).
  let logoAssetId: string | null = null
  let logoNote: string | null = null
  const logo = formData.get('logo')
  if (logo instanceof File && logo.size > 0) {
    const result = await uploadImageFile(logo, `${slug}-logo`)
    if ('assetId' in result) logoAssetId = result.assetId
    else logoNote = result.error
  }

  const fields: Record<string, unknown> = { name: values.name, kind }
  if (values.about) fields.about = values.about.slice(0, LIMITS.about)
  if (values.pitchInfo) fields.pitchInfo = values.pitchInfo.slice(0, LIMITS.pitch)
  if (genresCovered.length) fields.genresCovered = genresCovered
  if (links.length) fields.links = links
  if (logoAssetId) {
    fields.logo = {
      _type: 'imageWithAlt',
      asset: { _type: 'reference', _ref: logoAssetId },
      alt: values.logoAlt || undefined,
    }
  }

  const draftId = `drafts.${targetId}`
  try {
    if (isUpdate) {
      const published = await client.fetch<Record<string, unknown> | null>(`*[_id==$id][0]`, { id: targetId })
      const seed: Record<string, unknown> = published
        ? { ...published, _id: draftId }
        : { _id: draftId, _type: 'media', slug: { _type: 'slug', current: slug } }
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
        _type: 'media',
        slug: { _type: 'slug', current: slug },
        ...fields,
      })
      try {
        await recordOwnership(email, targetId)
      } catch (cause) {
        console.error('[media-intake] ownership seed failed', cause)
      }
    }
  } catch (cause) {
    console.error('[media-intake] draft write failed', cause)
    return { status: 'error', message: 'Something went wrong saving your submission — please try again.', values }
  }

  await Promise.all([
    notifyTeam({ name: values.name, email, slug, isUpdate, note: values.anythingElse, logoNote }),
    notifyCreator({ email, isUpdate }),
  ])

  return { status: 'success' }
}

async function notifyTeam(input: {
  name: string
  email: string
  slug: string
  isUpdate: boolean
  note: string
  logoNote: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) return

  const lines = [
    input.isUpdate ? `Media update: ${input.name}` : `New media outlet: ${input.name}`,
    `Review + publish in the Studio (draft id: drafts.media-${input.slug}).`,
    ``,
    `Submitted by (consent on file, not stored in Sanity): ${input.email}`,
  ]
  if (input.note) lines.push(``, `They added:`, input.note)
  if (input.logoNote) lines.push(``, `Heads up: the logo didn’t upload — ${input.logoNote}`)

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[ND Riot] ${input.isUpdate ? 'Media update' : 'New media'}: ${input.name}`,
        text: lines.join('\n'),
      }),
    })
  } catch (cause) {
    console.error('[media-intake] team notification failed', cause)
  }
}

async function notifyCreator(input: { email: string; isUpdate: boolean }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  if (!apiKey || !from) return

  const subject = input.isUpdate
    ? 'An update to your media listing has been submitted to NDRiot.com'
    : 'Your media listing has been submitted to NDRiot.com'
  const text = [
    input.isUpdate ? 'Thanks — your update has been received.' : 'Thanks for submitting your outlet to ND Riot.',
    '',
    'A person reviews every submission before it goes live, so your listing will appear shortly. We’ll be in touch if anything needs a look.',
    '',
    '— ND Riot',
  ].join('\n')

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [input.email], reply_to: REPLY_TO, subject, text }),
    })
  } catch (cause) {
    console.error('[media-intake] creator confirmation failed', cause)
  }
}

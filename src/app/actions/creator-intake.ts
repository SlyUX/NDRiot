'use server'

import { GENRES, FORMATS, MATURITY_RATINGS } from '@/lib/taxonomy'
import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import {
  isYes,
  matchTaxonomy,
  parseSocials,
  parseWorks,
  slugify,
  toPortableText,
} from '@/lib/intake/mapping'
import { uploadImageFile } from '@/lib/intake/uploads'
import { INTAKE_CREATOR_IDS_QUERY, INTAKE_ORGANIZATIONS_QUERY } from '@/lib/queries'
import { getWriteClient } from '@/sanity/write-client'

/**
 * Creator intake — Stage 3 of the content-intake strategy.
 *
 * A public, anonymous form (like today's Google Form) that writes a single
 * creator **review draft** straight into Sanity. Never live content, never a
 * published document: the draft/publish split IS the approval queue
 * (content-intake.md), and a human publishes in the Studio. The only writes
 * this makes are one `drafts.creator-<slug>` document and its uploaded photo
 * asset — organizations are referenced, never created here, so nothing
 * anonymous ever reaches a published document.
 *
 * The email is a consent record, not content. It rides the team notification
 * below and is deliberately NOT stored in the public dataset (§ no-PII).
 *
 * Validation microcopy is inline, matching the sibling contact action — these
 * are error-boundary strings, the §2 exception, not display copy.
 */

type FieldName = 'name' | 'email' | 'bio' | 'permission'

export type CreatorIntakeState = {
  status: 'idle' | 'success' | 'error'
  /** A send-level message — a reason it failed the reader can act on. */
  message?: string
  /** Per-field problems for inline display. */
  fieldErrors?: Partial<Record<FieldName, string>>
  /**
   * Text fields echoed back so a validation error doesn't wipe the form. File
   * inputs and multi-selects can't be restored by the browser, but prose can.
   */
  values?: {
    name: string
    email: string
    bio: string
    slug: string
    location: string
    website: string
    socials: string
    works: string
    photoAlt: string
    anythingElse: string
  }
}

const LIMITS = { name: 120, bio: 8000 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A `creator-<slug>` id nobody holds yet — published or draft. Two submitters
 *  picking the same web address must not collide onto one document. */
function uniqueSlug(base: string, takenIds: Set<string>): string {
  const root = base || 'creator'
  let slug = root
  let n = 1
  while (takenIds.has(`creator-${slug}`)) {
    n += 1
    slug = `${root}-${n}`
  }
  return slug
}

export async function submitCreator(
  _prev: CreatorIntakeState,
  formData: FormData,
): Promise<CreatorIntakeState> {
  // Two bot signals → silent success. Telling a bot it was caught just teaches
  // it to adapt (matches the contact action).
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const values = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    bio: String(formData.get('bio') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim(),
    location: String(formData.get('location') ?? '').trim(),
    website: String(formData.get('website') ?? '').trim(),
    socials: String(formData.get('socials') ?? '').trim(),
    works: String(formData.get('works') ?? '').trim(),
    photoAlt: String(formData.get('photoAlt') ?? '').trim(),
    anythingElse: String(formData.get('anythingElse') ?? '').trim(),
  }

  const fieldErrors: NonNullable<CreatorIntakeState['fieldErrors']> = {}
  if (!values.name) fieldErrors.name = 'Please add the name you want to be credited by.'
  else if (values.name.length > LIMITS.name)
    fieldErrors.name = 'That name is very long — please shorten it.'
  if (!values.email) fieldErrors.email = 'Please add an email so we can reach you about your listing.'
  else if (!EMAIL.test(values.email)) fieldErrors.email = 'That email doesn’t look right.'
  if (!values.bio) fieldErrors.bio = 'Please tell us a little about your work.'
  else if (values.bio.length > LIMITS.bio)
    fieldErrors.bio = 'That’s longer than we can store — please trim it.'
  if (!isYes(String(formData.get('permission') ?? '')))
    fieldErrors.permission = 'We can only list work you confirm you have the right to share.'

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors, values }
  }

  if (await rateLimited('creator-intake')) {
    return {
      status: 'error',
      message: 'Too many submissions just now. Give it a few minutes.',
      values,
    }
  }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    // Missing token is our misconfiguration, not the sender's fault.
    console.error('[creator-intake] write client unavailable', cause)
    return {
      status: 'error',
      message: 'On-site submissions are temporarily unavailable — please use the form linked below.',
      values,
    }
  }

  // Reads through the WRITE client (token) so creator ids include drafts.
  let orgIdSet: Set<string>
  let takenIds: Set<string>
  try {
    const [orgs, creatorIds] = await Promise.all([
      client.fetch<{ _id: string; name: string }[]>(INTAKE_ORGANIZATIONS_QUERY),
      client.fetch<string[]>(INTAKE_CREATOR_IDS_QUERY),
    ])
    orgIdSet = new Set((orgs ?? []).map((o) => o._id))
    takenIds = new Set((creatorIds ?? []).map((id) => id.replace(/^drafts\./, '')))
  } catch (cause) {
    console.error('[creator-intake] reference read failed', cause)
    return { status: 'error', message: 'Something went wrong — please try again.', values }
  }

  // References: keep only ids that really exist, so a tampered post can't attach
  // a creator to an invented org. Studio is single; memberships cap at three and
  // never duplicate the studio.
  const submittedStudio = String(formData.get('studio') ?? '').trim()
  const studioId = orgIdSet.has(submittedStudio) ? submittedStudio : null
  const orgIds = [...new Set(formData.getAll('orgs').map(String))]
    .filter((id) => orgIdSet.has(id) && id !== studioId)
    .slice(0, 3)

  // Taxonomy values are already canonical from the form, but match anyway so a
  // tampered value is dropped rather than stored. Genres capped at three.
  const genres = matchTaxonomy(formData.getAll('genres').map(String), GENRES).matched.slice(0, 3)
  const formats = matchTaxonomy(formData.getAll('formats').map(String), FORMATS).matched
  const audience = matchTaxonomy(String(formData.get('audience') ?? ''), MATURITY_RATINGS, {
    single: true,
  }).matched[0]

  const slug = uniqueSlug(slugify(values.slug || values.name), takenIds)

  // Photo is optional and its failure is non-fatal — note it and keep the draft.
  let photoAssetId: string | null = null
  let photoNote: string | null = null
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadImageFile(photo, `${slug}-photo`)
    if ('assetId' in result) photoAssetId = result.assetId
    else photoNote = result.error
  }

  const website =
    values.website && !/^https?:\/\//i.test(values.website)
      ? `https://${values.website}`
      : values.website

  // Every optional field is written only when it has a value — matching the
  // importer, so a later edit's blank never silently clears a filled field.
  const doc: { _id: string; _type: string; [key: string]: unknown } = {
    _id: `drafts.creator-${slug}`,
    _type: 'creator',
    name: values.name,
    slug: { _type: 'slug', current: slug },
    openToCollaboration: isYes(String(formData.get('collab') ?? '')),
  }
  if (values.location) doc.location = values.location
  if (website) doc.website = website
  if (values.bio) doc.bio = toPortableText(values.bio)
  const socials = parseSocials(values.socials)
  if (socials.length) doc.socials = socials
  const works = parseWorks(values.works)
  if (works.length) doc.works = works
  if (genres.length) doc.genres = genres
  if (formats.length) doc.formats = formats
  if (audience) doc.audience = audience
  if (studioId) doc.studio = { _type: 'reference', _ref: studioId }
  if (orgIds.length) {
    doc.organizations = orgIds.map((id) => ({ _type: 'reference', _key: id, _ref: id }))
  }
  if (photoAssetId) {
    doc.photo = {
      _type: 'imageWithAlt',
      asset: { _type: 'reference', _ref: photoAssetId },
      alt: values.photoAlt || undefined,
    }
  }

  try {
    await client.create(doc)
  } catch (cause) {
    console.error('[creator-intake] draft write failed', cause)
    return { status: 'error', message: 'Something went wrong saving your submission — please try again.', values }
  }

  await notifyTeam({
    name: values.name,
    email: values.email,
    slug,
    note: values.anythingElse,
    photoNote,
  })

  return { status: 'success' }
}

/**
 * Best-effort team notification — the arrival signal and the consent record in
 * one. Env-gated and non-blocking: the draft is already saved, so a mail
 * failure must never surface to the submitter. Reuses the contact channel's
 * Resend config.
 */
async function notifyTeam(input: {
  name: string
  email: string
  slug: string
  note: string
  photoNote: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) return

  const lines = [
    `New creator draft: ${input.name}`,
    `Review + publish in the Studio (draft id: drafts.creator-${input.slug}).`,
    ``,
    `Consent on file — email not stored in Sanity: ${input.email}`,
  ]
  if (input.note) lines.push(``, `They added:`, input.note)
  if (input.photoNote) lines.push(``, `Heads up: their photo didn’t upload — ${input.photoNote}`)

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[ND Riot] New creator: ${input.name}`,
        text: lines.join('\n'),
      }),
    })
  } catch (cause) {
    console.error('[creator-intake] team notification failed', cause)
  }
}

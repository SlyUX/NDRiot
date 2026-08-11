'use server'

import { GENRES, FORMATS, SOCIAL_PLATFORMS } from '@/lib/taxonomy'
import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import {
  buildSocials,
  buildWorks,
  isYes,
  matchTaxonomy,
  normalizeUrl,
  slugify,
  toPortableText,
} from '@/lib/intake/mapping'
import { uploadImageFile } from '@/lib/intake/uploads'
import { fetchFeed } from '@/lib/feed-parse'
import { INTAKE_CREATOR_IDS_QUERY, INTAKE_ORGANIZATIONS_QUERY } from '@/lib/queries'
import { auth } from '@/auth'
import { ownsCreator, recordOwnership } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'

/**
 * Creator intake — Stage 3 of the content-intake strategy.
 *
 * Google sign-in is required (Layer 2 ownership): the verified email is the
 * consent record and the ownership key, and is never stored in the public
 * dataset (it lives only in the private ownership map). Writes a single creator
 * **review draft** — never live content, never a published document. The
 * draft/publish split IS the approval queue (content-intake.md); a human
 * publishes in the Studio. Organizations are referenced, never created.
 *
 * Two modes:
 *  - **New**: creates a fresh draft at a unique `creator-<slug>` id and records
 *    the signed-in email as its owner.
 *  - **Update**: allowed ONLY if the signed-in email owns the target. Seeds a
 *    draft from the published profile, then patches the supplied fields —
 *    matching the importer's update path, preserving identity (name/slug).
 */

type FieldName = 'name' | 'bio' | 'permission' | 'feedUrl'

export type CreatorIntakeState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<FieldName, string>>
  values?: {
    name: string
    bio: string
    slug: string
    location: string
    website: string
    feedUrl: string
    photoAlt: string
    anythingElse: string
  }
}

const LIMITS = { name: 120, bio: 8000 }
const CREATOR_REPLY_TO = 'submission@ndriot.com'

/** A `creator-<slug>` id nobody holds yet — published or draft. */
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

/**
 * Resolve a named studio to an org id: reuse an existing org matching by name
 * (case-insensitive), else create it published — with its logo and website —
 * so the creator's `studio` reference resolves. Mirrors the importer's
 * resolveOrganization. Logo upload is non-fatal.
 */
async function resolveStudio(
  client: ReturnType<typeof getWriteClient>,
  existing: { _id: string; name: string }[],
  name: string,
  url: string,
  logo: File | null,
): Promise<string | null> {
  const clean = name.trim()
  if (!clean) return null

  // Upload a new logo up front — used whether we update an existing studio or
  // create one.
  let logoAssetId: string | null = null
  if (logo && logo.size > 0) {
    const result = await uploadImageFile(logo, `${slugify(clean) || 'studio'}-logo`)
    if ('assetId' in result) logoAssetId = result.assetId
  }
  const logoField = logoAssetId
    ? { logo: { _type: 'imageWithAlt', asset: { _type: 'reference', _ref: logoAssetId } } }
    : {}

  const match = existing.find((o) => o.name.trim().toLowerCase() === clean.toLowerCase())
  if (match) {
    // Update the existing studio's website/logo when the creator supplies them.
    // A live edit to a shared org, consistent with how studios are created here.
    const patch: Record<string, unknown> = { ...(url ? { website: url } : {}), ...logoField }
    if (Object.keys(patch).length) {
      try {
        await client.patch(match._id).set(patch).commit()
      } catch (cause) {
        console.error('[creator-intake] studio update failed', cause)
      }
    }
    return match._id
  }

  const slug = slugify(clean)
  if (!slug) return null
  const id = `organization-${slug}`
  const doc: { _id: string; _type: string; [key: string]: unknown } = {
    _id: id,
    _type: 'organization',
    name: clean,
    slug: { _type: 'slug', current: slug },
    ...(url ? { website: url } : {}),
    ...logoField,
  }
  try {
    await client.createIfNotExists(doc)
    return id
  } catch (cause) {
    console.error('[creator-intake] studio create failed', cause)
    return null
  }
}

/**
 * Resolve free-text "organization name + URL" rows to org ids: reuse an
 * existing org matching by name (case-insensitive), else create it published
 * so the reference resolves — the importer's rule. Blanks and the chosen studio
 * are skipped; failures are logged, not fatal.
 */
async function resolveNewOrgs(
  client: ReturnType<typeof getWriteClient>,
  existing: { _id: string; name: string }[],
  names: string[],
  urls: string[],
  studioId: string | null,
): Promise<string[]> {
  const byName = new Map(existing.map((o) => [o.name.trim().toLowerCase(), o._id]))
  const out: string[] = []
  const rows = Math.max(names.length, urls.length)
  for (let r = 0; r < rows; r += 1) {
    const name = (names[r] ?? '').trim()
    if (!name) continue
    const url = normalizeUrl(urls[r]) ?? ''

    const existingId = byName.get(name.toLowerCase())
    if (existingId) {
      if (existingId !== studioId) out.push(existingId)
      continue
    }
    const slug = slugify(name)
    if (!slug) continue
    const id = `organization-${slug}`
    try {
      await client.createIfNotExists({
        _id: id,
        _type: 'organization',
        name,
        slug: { _type: 'slug', current: slug },
        ...(url ? { website: url } : {}),
      })
      byName.set(name.toLowerCase(), id) // dedupe repeats within one submission
      if (id !== studioId) out.push(id)
    } catch (cause) {
      console.error('[creator-intake] org create failed', cause)
    }
  }
  return out
}

export async function submitCreator(
  _prev: CreatorIntakeState,
  formData: FormData,
): Promise<CreatorIntakeState> {
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const values = {
    name: String(formData.get('name') ?? '').trim(),
    bio: String(formData.get('bio') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim(),
    location: String(formData.get('location') ?? '').trim(),
    website: String(formData.get('website') ?? '').trim(),
    feedUrl: String(formData.get('feedUrl') ?? '').trim(),
    photoAlt: String(formData.get('photoAlt') ?? '').trim(),
    anythingElse: String(formData.get('anythingElse') ?? '').trim(),
  }

  // Identity comes from the verified session, never the form — re-checked here
  // even though /join hides the form when signed out (never trust the client).
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) {
    return { status: 'error', message: 'Your session expired — please sign in again.', values }
  }

  const fieldErrors: NonNullable<CreatorIntakeState['fieldErrors']> = {}
  if (!values.name) fieldErrors.name = 'Please add the name you want to be credited by.'
  else if (values.name.length > LIMITS.name)
    fieldErrors.name = 'That name is very long — please shorten it.'
  if (!values.bio) fieldErrors.bio = 'Please tell us a little about your work.'
  else if (values.bio.length > LIMITS.bio)
    fieldErrors.bio = 'That’s longer than we can store — please trim it.'
  if (!isYes(String(formData.get('permission') ?? '')))
    fieldErrors.permission = 'We can only list work you confirm you have the right to share.'

  // Feed URL is optional; when given, it must be a valid address AND actually
  // resolve to a real RSS/Atom feed (same server-side check the Studio uses).
  const feedUrl = normalizeUrl(values.feedUrl)
  if (values.feedUrl && !feedUrl) fieldErrors.feedUrl = 'That doesn’t look like a valid web address.'
  else if (feedUrl && !(await fetchFeed(feedUrl)))
    fieldErrors.feedUrl = 'No RSS or Atom feed found at this address.'

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
    console.error('[creator-intake] write client unavailable', cause)
    return {
      status: 'error',
      message: 'On-site submissions are temporarily unavailable — please use the form linked below.',
      values,
    }
  }

  // Is this an update? A supplied `updateId` must resolve to a real published
  // creator; anything else is treated as a new submission.
  const submittedUpdateId = String(formData.get('updateId') ?? '').trim()
  let target: { _id: string; name?: string; slug?: { current?: string } } | null = null
  if (submittedUpdateId) {
    try {
      target = await client.fetch<typeof target>(
        `*[_type=="creator" && _id==$id && defined(slug.current)][0]`,
        { id: submittedUpdateId },
      )
    } catch (cause) {
      console.error('[creator-intake] update target read failed', cause)
    }
  }
  const isUpdate = Boolean(target)

  // Ownership gate: you may only update a profile the ownership map says this
  // verified email owns. A crafted updateId for someone else's profile is
  // refused here, not silently downgraded to a new submission.
  if (isUpdate && !(await ownsCreator(email, target!._id))) {
    return { status: 'error', message: 'You can only edit a profile you own.', values }
  }

  // Reference validation + slug uniqueness (uniqueness only matters for a new
  // profile). Reads through the WRITE client so creator ids include drafts.
  let orgIdSet: Set<string>
  let takenIds: Set<string>
  let orgs: { _id: string; name: string }[] = []
  try {
    const [orgList, creatorIds] = await Promise.all([
      client.fetch<{ _id: string; name: string }[]>(INTAKE_ORGANIZATIONS_QUERY),
      client.fetch<string[]>(INTAKE_CREATOR_IDS_QUERY),
    ])
    orgs = orgList ?? []
    orgIdSet = new Set(orgs.map((o) => o._id))
    takenIds = new Set((creatorIds ?? []).map((id) => id.replace(/^drafts\./, '')))
  } catch (cause) {
    console.error('[creator-intake] reference read failed', cause)
    return { status: 'error', message: 'Something went wrong — please try again.', values }
  }

  // Studio: a newly-named studio (name + URL + logo, created alongside the
  // creator) wins over the dropdown selection.
  const submittedStudio = String(formData.get('studio') ?? '').trim()
  const newStudioName = String(formData.get('studioName') ?? '').trim()
  const studioUrl = normalizeUrl(String(formData.get('studioUrl') ?? '')) ?? ''
  const studioLogo = formData.get('studioLogo')
  const studioId = newStudioName
    ? await resolveStudio(
        client,
        orgs,
        newStudioName,
        studioUrl,
        studioLogo instanceof File ? studioLogo : null,
      )
    : orgIdSet.has(submittedStudio)
      ? submittedStudio
      : null

  // Checkbox selections, plus any orgs added by name+URL. New orgs reuse an
  // existing one that matches by name, else are created (published, so the
  // reference resolves) — the importer's rule. The signed-in requirement is
  // what makes creating an org here acceptable; the creator stays a review
  // draft a human approves. Combined list is capped at three.
  const selectedOrgIds = [...new Set(formData.getAll('orgs').map(String))].filter(
    (id) => orgIdSet.has(id) && id !== studioId,
  )
  const newOrgIds = await resolveNewOrgs(
    client,
    orgs,
    formData.getAll('newOrgName').map(String),
    formData.getAll('newOrgUrl').map(String),
    studioId,
  )
  const orgIds = [...new Set([...selectedOrgIds, ...newOrgIds])].slice(0, 3)

  const genres = matchTaxonomy(formData.getAll('genres').map(String), GENRES).matched.slice(0, 3)
  const formats = matchTaxonomy(formData.getAll('formats').map(String), FORMATS).matched

  // On update the slug and id are the target's; a new profile gets a free one.
  const slug = isUpdate
    ? (target!.slug?.current ?? slugify(values.name))
    : uniqueSlug(slugify(values.slug || values.name), takenIds)
  const targetId = isUpdate ? target!._id : `creator-${slug}`

  // Photo (optional, non-fatal). On update, only a newly-uploaded photo is
  // written; without one the seeded draft keeps the live photo.
  let photoAssetId: string | null = null
  let photoNote: string | null = null
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadImageFile(photo, `${slug}-photo`)
    if ('assetId' in result) photoAssetId = result.assetId
    else photoNote = result.error
  }

  const website = normalizeUrl(values.website)

  // The editable fields, each included only when it has a value — so a blank
  // never overwrites a filled field (matches the importer). Shared by both the
  // new-doc build and the update patch.
  const fields: Record<string, unknown> = {
    openToCollaboration: isYes(String(formData.get('collab') ?? '')),
  }
  if (values.location) fields.location = values.location
  if (website) fields.website = website
  if (feedUrl) fields.feedUrl = feedUrl
  if (values.bio) fields.bio = toPortableText(values.bio)
  const socials = buildSocials(
    formData.getAll('socialPlatform').map(String),
    formData.getAll('socialValue').map(String),
    SOCIAL_PLATFORMS,
  )
  if (socials.length) fields.socials = socials
  const works = buildWorks(
    formData.getAll('workLabel').map(String),
    formData.getAll('workUrl').map(String),
  )
  if (works.length) fields.works = works
  if (genres.length) fields.genres = genres
  if (formats.length) fields.formats = formats
  if (studioId) fields.studio = { _type: 'reference', _ref: studioId }
  if (orgIds.length) {
    fields.organizations = orgIds.map((id) => ({ _type: 'reference', _key: id, _ref: id }))
  }
  if (photoAssetId) {
    fields.photo = {
      _type: 'imageWithAlt',
      asset: { _type: 'reference', _ref: photoAssetId },
      alt: values.photoAlt || undefined,
    }
  }

  const draftId = `drafts.${targetId}`
  try {
    if (isUpdate) {
      // Seed the draft as a faithful copy of the live doc so publishing the
      // edit never drops an untouched field, then set just the supplied ones.
      // Identity (name/slug) is preserved — an update never renames.
      const published = await client.fetch<Record<string, unknown> | null>(
        `*[_id==$id][0]`,
        { id: targetId },
      )
      const seed: Record<string, unknown> = published
        ? { ...published, _id: draftId }
        : { _id: draftId, _type: 'creator', name: target!.name, slug: { _type: 'slug', current: slug } }
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
        _type: 'creator',
        name: values.name,
        slug: { _type: 'slug', current: slug },
        ...fields,
      })
      // A new profile's creator owns it: record the verified email → creatorId
      // in the private ownership map so they can edit it later. Best-effort — a
      // store hiccup must not fail an already-written draft; the claim flow can
      // repair a missing link.
      try {
        await recordOwnership(email, targetId)
      } catch (cause) {
        console.error('[creator-intake] ownership seed failed', cause)
      }
    }
  } catch (cause) {
    console.error('[creator-intake] draft write failed', cause)
    return {
      status: 'error',
      message: 'Something went wrong saving your submission — please try again.',
      values,
    }
  }

  await Promise.all([
    notifyTeam({ name: values.name, email, slug, isUpdate, note: values.anythingElse, photoNote }),
    notifyCreator({ email, isUpdate }),
  ])

  return { status: 'success' }
}

/**
 * Best-effort team notification — the arrival signal and the consent record.
 * Env-gated and non-blocking: the draft is saved regardless. Reuses the contact
 * channel's Resend config.
 */
async function notifyTeam(input: {
  name: string
  email: string
  slug: string
  isUpdate: boolean
  note: string
  photoNote: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) return

  const kind = input.isUpdate ? 'update to a creator' : 'new creator'
  const lines = [
    input.isUpdate ? `Update to creator: ${input.name}` : `New creator draft: ${input.name}`,
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
        subject: `[ND Riot] ${kind}: ${input.name}`,
        text: lines.join('\n'),
      }),
    })
  } catch (cause) {
    console.error('[creator-intake] team notification failed', cause)
  }
}

/**
 * Confirmation to the submitter. Best-effort and env-gated like the team note.
 * Replies route to submission@ndriot.com. The update copy invites them to flag
 * a change they didn't make — a light touch, since real protection is the
 * human review the draft still passes through.
 */
async function notifyCreator(input: { email: string; isUpdate: boolean }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  if (!apiKey || !from) return

  const subject = input.isUpdate
    ? 'An update to your Creator account has been submitted to NDRiot.com'
    : 'Your Creator Account has been submitted on NDRiot.com'

  const text = input.isUpdate
    ? [
        'Thanks — your update has been received.',
        '',
        'A person reviews every change before it goes live, so your updated profile will appear shortly.',
        '',
        'If you didn’t request this change, just reply to this email and let us know.',
        '',
        '— ND Riot',
      ].join('\n')
    : [
        'Thanks for submitting your creator profile to ND Riot.',
        '',
        'A person reviews every submission before it goes live, so your page will appear shortly. We’ll be in touch if anything needs a look.',
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
    console.error('[creator-intake] creator confirmation failed', cause)
  }
}

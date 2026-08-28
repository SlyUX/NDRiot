'use server'

import { GENRES, MATURITY_RATINGS } from '@/lib/taxonomy'
import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import { isYes, matchTaxonomy, slugify } from '@/lib/intake/mapping'
import { uploadImageFile } from '@/lib/intake/uploads'
import { fillTokens, sendEmail } from '@/lib/notify-email'
import { INTAKE_SERIES_IDS_QUERY, INTAKE_STRIP_IDS_QUERY } from '@/lib/queries'
import { getSiteSettings, type NotificationsSettings } from '@/lib/site-settings'
import { auth } from '@/auth'
import { creatorsOwnedBy } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'

/**
 * Strip intake — the same Stage-3 model as the comic form. A strip is a
 * single-page comic HOSTED on ND Riot, so this is image-first: the uploaded page
 * IS the work (required, not an optional cover), and there are no link-out
 * fields. Writes a single **review draft** (`drafts.strip-<slug>`); a human
 * publishes. Publishing is the approval — the human review is the content-safety
 * safeguard for creator-uploaded art, so nothing a creator posts is ever public
 * unseen. Google sign-in required.
 *
 * Ownership is INHERITED from the creator (strips aren't in the ownership map —
 * the creator is): the creator dropdown is scoped to owned creators, and the
 * chosen creator is re-checked here, fail-closed. Create-only for now (no update
 * mode — strips are lightweight).
 */

type FieldName = 'title' | 'creator' | 'image' | 'maturity' | 'permission'

export type StripIntakeState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<FieldName, string>>
  values?: {
    title: string
    caption: string
    imageAlt: string
  }
}

const LIMITS = { title: 200, caption: 150 }
const CREATOR_REPLY_TO = 'submission@ndriot.com'

/** A `strip-<slug>` id nobody holds yet — published or draft. */
function uniqueSlug(base: string, takenIds: Set<string>): string {
  const root = base || 'strip'
  let slug = root
  let n = 1
  while (takenIds.has(`strip-${slug}`)) {
    n += 1
    slug = `${root}-${n}`
  }
  return slug
}

/** A `stripSeries-<slug>` id nobody holds yet — published or draft. */
function uniqueSeriesSlug(base: string, takenIds: Set<string>): string {
  const root = base || 'series'
  let slug = root
  let n = 1
  while (takenIds.has(`stripSeries-${slug}`)) {
    n += 1
    slug = `${root}-${n}`
  }
  return slug
}

export async function submitStrip(
  _prev: StripIntakeState,
  formData: FormData,
): Promise<StripIntakeState> {
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const values = {
    title: String(formData.get('title') ?? '').trim(),
    caption: String(formData.get('caption') ?? '').trim(),
    imageAlt: String(formData.get('imageAlt') ?? '').trim(),
  }

  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) {
    return { status: 'error', message: 'Your session expired — please sign in again.', values }
  }

  // Required — a strip declares its own audience (removing the opt-out); on
  // creator-uploaded work that self-rating is a real content-safety signal.
  const maturity = matchTaxonomy(String(formData.get('maturity') ?? ''), MATURITY_RATINGS, {
    single: true,
  }).matched[0]

  const fieldErrors: NonNullable<StripIntakeState['fieldErrors']> = {}
  if (!values.title) fieldErrors.title = 'Please add a title for the strip.'
  else if (values.title.length > LIMITS.title) fieldErrors.title = 'That title is very long — please shorten it.'
  if (!maturity) fieldErrors.maturity = 'Please choose who this strip is appropriate for.'
  if (!isYes(String(formData.get('permission') ?? '')))
    fieldErrors.permission = 'We can only post work you confirm you have the right to share.'

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors, values }
  }

  if (await rateLimited('strip-intake')) {
    return { status: 'error', message: 'Too many submissions just now. Give it a few minutes.', values }
  }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    console.error('[strip-intake] write client unavailable', cause)
    return { status: 'error', message: 'On-site submissions are temporarily unavailable — please try again shortly.', values }
  }

  // Which creators may this email credit a strip to?
  const ownedCreatorIds = new Set(await creatorsOwnedBy(email))
  if (ownedCreatorIds.size === 0) {
    return {
      status: 'error',
      message: 'Add a creator profile before posting a strip — a strip needs a creator.',
      values,
    }
  }

  // The creator this strip is credited to must be one you own.
  const submittedCreator = String(formData.get('creator') ?? '').trim()
  const creatorId = ownedCreatorIds.has(submittedCreator) ? submittedCreator : null
  if (!creatorId) {
    return { status: 'error', fieldErrors: { creator: 'Please choose one of your creators.' }, values }
  }

  // The page is required — a strip IS its image, so a missing/failed upload is
  // fatal here (unlike an optional book cover).
  const image = formData.get('image')
  if (!(image instanceof File) || image.size === 0) {
    return { status: 'error', fieldErrors: { image: 'Please add the strip’s page image.' }, values }
  }

  let takenIds: Set<string>
  try {
    const stripIds = await client.fetch<string[]>(INTAKE_STRIP_IDS_QUERY)
    takenIds = new Set((stripIds ?? []).map((id) => id.replace(/^drafts\./, '')))
  } catch (cause) {
    console.error('[strip-intake] strip-id read failed', cause)
    return { status: 'error', message: 'Something went wrong — please try again.', values }
  }

  const slug = uniqueSlug(slugify(values.title), takenIds)

  const upload = await uploadImageFile(image, `${slug}-strip`)
  if (!('assetId' in upload)) {
    return { status: 'error', fieldErrors: { image: `The image didn’t upload — ${upload.error}.` }, values }
  }

  // Single-select in the form; stored as the schema's genre array (one entry).
  const genres = matchTaxonomy(formData.getAll('genre').map(String), GENRES).matched.slice(0, 1)

  // Series (optional): attach to one of the creator's existing series, or start
  // a new one. A new series is a review-gated draft (published alongside the
  // strip); dedupe by slug against ALL series (drafts included) so two strips
  // submitted to the same new name don't fork it. Ownership-scoped, fail-open:
  // a failed series read never sinks the strip.
  let seriesRef: { _type: 'reference'; _ref: string } | undefined
  let newSeriesCreated: string | null = null
  const submittedSeriesId = String(formData.get('seriesId') ?? '').trim()
  const newSeriesName = String(formData.get('newSeriesName') ?? '').trim()
  if (submittedSeriesId || newSeriesName) {
    const bareId = (id: string) => id.replace(/^drafts\./, '')
    let allSeries: { _id: string; slug: string | null; creatorId: string | null }[] = []
    try {
      allSeries = (await client.fetch<typeof allSeries>(INTAKE_SERIES_IDS_QUERY)) ?? []
    } catch (cause) {
      console.error('[strip-intake] series read failed', cause)
    }
    const ownedSeries = allSeries.filter((s) => s.creatorId === creatorId)

    if (submittedSeriesId && ownedSeries.some((s) => bareId(s._id) === bareId(submittedSeriesId))) {
      seriesRef = { _type: 'reference', _ref: bareId(submittedSeriesId) }
    } else if (newSeriesName) {
      const wantSlug = slugify(newSeriesName)
      const existing = ownedSeries.find((s) => s.slug === wantSlug)
      if (existing) {
        seriesRef = { _type: 'reference', _ref: bareId(existing._id) }
      } else {
        const takenSeriesIds = new Set(allSeries.map((s) => bareId(s._id)))
        const seriesSlug = uniqueSeriesSlug(wantSlug, takenSeriesIds)
        const seriesId = `stripSeries-${seriesSlug}`
        try {
          await client.create({
            _id: `drafts.${seriesId}`,
            _type: 'stripSeries',
            title: newSeriesName.slice(0, 200),
            slug: { _type: 'slug', current: seriesSlug },
            creator: { _type: 'reference', _ref: creatorId },
          })
          seriesRef = { _type: 'reference', _ref: seriesId }
          newSeriesCreated = newSeriesName
        } catch (cause) {
          console.error('[strip-intake] series create failed', cause)
        }
      }
    }
  }

  const fields: Record<string, unknown> = {
    title: values.title,
    creator: { _type: 'reference', _ref: creatorId },
    image: {
      _type: 'imageWithAlt',
      asset: { _type: 'reference', _ref: upload.assetId },
      alt: values.imageAlt || undefined,
    },
    // Set now so ordering works the moment it's published; a reviewer can adjust.
    publishedAt: new Date().toISOString(),
  }
  if (values.caption) fields.caption = values.caption.slice(0, LIMITS.caption)
  if (genres.length) fields.genres = genres
  if (maturity) fields.maturity = maturity
  if (seriesRef) fields.series = seriesRef

  const draftId = `drafts.strip-${slug}`
  try {
    await client.create({
      _id: draftId,
      _type: 'strip',
      slug: { _type: 'slug', current: slug },
      ...fields,
    })
  } catch (cause) {
    console.error('[strip-intake] draft write failed', cause)
    return { status: 'error', message: 'Something went wrong saving your strip — please try again.', values }
  }

  const notifications = (await getSiteSettings()).notifications
  await Promise.all([
    notifyTeam({ title: values.title, email, slug, newSeries: newSeriesCreated }),
    notifyCreator({ email, title: values.title, copy: notifications }),
  ])

  return { status: 'success' }
}

/** Best-effort team notification — arrival signal + consent record. */
async function notifyTeam(input: {
  title: string
  email: string
  slug: string
  newSeries: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) return

  const lines = [
    `New strip: ${input.title}`,
    `Review + publish in the Studio (draft id: drafts.strip-${input.slug}).`,
    ``,
    `Submitted by (consent on file, not stored in Sanity): ${input.email}`,
  ]
  if (input.newSeries) {
    lines.push(
      ``,
      `It also STARTS A NEW SERIES: “${input.newSeries}” — publish that series draft too, or the strip's series link won't resolve.`,
    )
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[ND Riot] New strip: ${input.title}`,
        text: lines.join('\n'),
      }),
    })
  } catch (cause) {
    console.error('[strip-intake] team notification failed', cause)
  }
}

/** Confirmation to the submitter — CMS-managed "strip submitted" copy (§2). */
async function notifyCreator(input: {
  email: string
  title: string
  copy: NotificationsSettings
}): Promise<void> {
  await sendEmail({
    to: input.email,
    subject: input.copy.stripSubmitSubject,
    text: fillTokens(input.copy.stripSubmitBody, { title: input.title }),
    replyTo: CREATOR_REPLY_TO,
  })
}

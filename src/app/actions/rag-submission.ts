'use server'

import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import { countWords, normalizeUrl } from '@/lib/intake/mapping'
import { uploadImageFile } from '@/lib/intake/uploads'
import { fillTokens, sendEmail } from '@/lib/notify-email'
import { ragIssueLabel } from '@/lib/rag'
import {
  OWNED_DOCS_QUERY,
  RAG_CREATOR_PREVIEW_COUNT_QUERY,
  RAG_OPEN_SUBMISSIONS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { auth } from '@/auth'
import { creatorsOwnedBy } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'
import { getSubmissionClient } from '@/sanity/rag-submission-client'

/**
 * ND Riot Rag submission — a creator proposing work for an open issue.
 *
 * Same native-intake recipe as the strip/comic forms (anti-spam → session email
 * → ownership gate → validate → rate-limit → write), with two differences:
 *  - it writes to the PRIVATE `ndriot_auth` dataset (the doc carries the
 *    submitter's email + pitch), never the public `production` dataset; and
 *  - there is no draft/publish approval here — the review happens in the
 *    Submissions Studio workspace via the Accept / Resubmit / Decline actions.
 *
 * Google sign-in + a creator profile are required; the chosen issue is re-checked
 * server-side to still be open, fail-closed.
 */

const REPLY_TO = 'submission@ndriot.com'
const PITCH_WORD_LIMIT = 750
const MAX_SAMPLE_IMAGES = 6

type FieldName = 'issue' | 'pitch' | 'pageCount' | 'samples'

export type RagSubmissionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<FieldName, string>>
  values?: { issueId: string; pitch: string; pageCount: string; workSampleLink: string }
}

export async function submitRagSubmission(
  _prev: RagSubmissionState,
  formData: FormData,
): Promise<RagSubmissionState> {
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const values = {
    issueId: String(formData.get('issueId') ?? '').trim(),
    pitch: String(formData.get('pitch') ?? '').trim(),
    pageCount: String(formData.get('pageCount') ?? '').trim(),
    workSampleLink: String(formData.get('workSampleLink') ?? '').trim(),
  }

  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) {
    return { status: 'error', message: 'Your session expired — please sign in again.', values }
  }
  const submitterName = session?.user?.name?.trim() || null

  let prod
  try {
    prod = getWriteClient()
  } catch (cause) {
    console.error('[rag-submission] production client unavailable', cause)
    return { status: 'error', message: 'Submissions are temporarily unavailable — please try again shortly.', values }
  }

  // Creator-only: resolve the signed-in creator's public identity (denormalized
  // onto the submission, since it lives in a different dataset than the creator).
  const ownedCreatorIds = [...new Set(await creatorsOwnedBy(email))]
  if (ownedCreatorIds.length === 0) {
    return { status: 'error', message: 'Submissions are open to ND Riot creators — add a creator profile first.', values }
  }
  const ownedDocs =
    (await prod.fetch<{ _id: string; _type: string; name: string | null; slug: string | null }[]>(
      OWNED_DOCS_QUERY,
      { ids: ownedCreatorIds },
    )) ?? []
  const creator = ownedDocs.find((d) => d._type === 'creator')
  if (!creator) {
    return { status: 'error', message: 'Submissions are open to ND Riot creators.', values }
  }

  // The chosen issue must still be accepting submissions (re-checked here).
  const openIssues = (await prod.fetch(RAG_OPEN_SUBMISSIONS_QUERY)) ?? []
  const issue = openIssues.find((i) => i._id === values.issueId) ?? openIssues[0] ?? null
  if (!issue) {
    return { status: 'error', fieldErrors: { issue: 'Submissions are closed for this issue.' }, values }
  }

  const fieldErrors: NonNullable<RagSubmissionState['fieldErrors']> = {}
  const words = countWords(values.pitch)
  if (words === 0) fieldErrors.pitch = 'Tell us what you have in mind.'
  else if (words > PITCH_WORD_LIMIT) fieldErrors.pitch = `Please keep it to ${PITCH_WORD_LIMIT} words (that’s ${words} right now).`
  const pages = Number.parseInt(values.pageCount, 10)
  if (!Number.isInteger(pages) || pages < 1 || pages > 12) {
    fieldErrors.pageCount = 'Choose a page count from 1 to 12.'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors, values }
  }

  // Work samples: required UNLESS this creator already has previewable work on
  // the site (then we can already see their work, so samples are optional).
  const files = formData
    .getAll('samples')
    .filter((f): f is File => f instanceof File && f.size > 0)
  const workSampleLink = normalizeUrl(values.workSampleLink) ?? undefined
  if (files.length === 0 && !workSampleLink) {
    const previewCount =
      (await prod.fetch<number>(RAG_CREATOR_PREVIEW_COUNT_QUERY, { id: creator._id })) ?? 0
    if (previewCount === 0) {
      return {
        status: 'error',
        fieldErrors: { samples: 'Add an image or a link to a sample of your work.' },
        values,
      }
    }
  }

  if (await rateLimited('rag-submission')) {
    return { status: 'error', message: 'Too many submissions just now. Give it a few minutes.', values }
  }

  let subClient
  try {
    subClient = getSubmissionClient()
  } catch (cause) {
    console.error('[rag-submission] submission client unavailable', cause)
    return { status: 'error', message: 'Submissions are temporarily unavailable — please try again shortly.', values }
  }

  // Sample images upload to the PRIVATE dataset (assets live per-dataset). A
  // failed upload is skipped, not fatal — one bad image never sinks the pitch.
  const workSampleImages: Array<{
    _type: 'imageWithAlt'
    _key: string
    asset: { _type: 'reference'; _ref: string }
  }> = []
  for (const [i, file] of files.slice(0, MAX_SAMPLE_IMAGES).entries()) {
    const upload = await uploadImageFile(file, `rag-sample-${Date.now()}-${i}`, subClient)
    if ('assetId' in upload) {
      workSampleImages.push({
        _type: 'imageWithAlt',
        _key: `sample-${i}`,
        asset: { _type: 'reference', _ref: upload.assetId },
      })
    }
  }

  try {
    await subClient.create({
      _type: 'ragSubmission',
      status: 'new',
      issueId: issue._id,
      issueTitle: issue.title,
      issueNumber: issue.issueNumber,
      issueSlug: issue.slug,
      creatorId: creator._id,
      creatorName: creator.name ?? undefined,
      creatorSlug: creator.slug ?? undefined,
      submitterName: submitterName ?? undefined,
      submitterEmail: email,
      pitch: values.pitch,
      pageCount: pages,
      ...(workSampleImages.length ? { workSampleImages } : {}),
      ...(workSampleLink ? { workSampleLink } : {}),
      submittedAt: new Date().toISOString(),
    })
  } catch (cause) {
    console.error('[rag-submission] write failed', cause)
    return { status: 'error', message: 'Something went wrong saving your submission — please try again.', values }
  }

  const { notifications } = await getSiteSettings()
  const issueLabel = ragIssueLabel(issue.issueNumber, issue.title)
  await Promise.all([
    sendEmail({
      to: email,
      subject: notifications.ragThanksSubject,
      text: fillTokens(notifications.ragThanksBody, {
        name: submitterName ?? 'there',
        issue: issueLabel,
      }),
      replyTo: REPLY_TO,
    }),
    notifyTeam({ email, creatorName: creator.name ?? 'A creator', issueLabel, pages, pitch: values.pitch }),
  ])

  return { status: 'success' }
}

/** Best-effort team notification — arrival signal + consent record. */
async function notifyTeam(input: {
  email: string
  creatorName: string
  issueLabel: string
  pages: number
  pitch: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) return

  const text = [
    `New Rag submission for ${input.issueLabel}`,
    `From: ${input.creatorName}`,
    `Pages: ${input.pages}`,
    ``,
    `Review it in the Submissions Studio workspace.`,
    ``,
    `Pitch:`,
    input.pitch,
    ``,
    `Reply-to is the submitter: ${input.email}`,
  ].join('\n')

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[ND Riot] New Rag submission: ${input.issueLabel}`,
        text,
      }),
    })
  } catch (cause) {
    console.error('[rag-submission] team notification failed', cause)
  }
}

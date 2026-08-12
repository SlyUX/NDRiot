import { fillTokens, sendEmail } from '@/lib/notify-email'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import { ownerEmailOf } from '@/sanity/ownership-client'
import { enqueueBook, markNotified, wasNotified } from '@/sanity/notify-store'

/**
 * Sanity publish webhook. Fires when a creator or book is published (Sanity
 * dashboard config: filter `_type in ["creator","book"]`, on create/update in
 * `production`, with an Authorization: Bearer <SANITY_WEBHOOK_SECRET> header).
 *
 *  - creator published → email the owner immediately (their profile is live).
 *  - book published    → queue it; the midnight cron sends one digest per creator.
 *
 * Once-only markers guard against the webhook re-firing on later edits, so a
 * creator is never emailed twice for the same event. Everything fail-soft.
 */
export const dynamic = 'force-dynamic'

type Json = unknown
const rec = (v: Json): Record<string, Json> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, Json>) : null
const str = (v: Json): string => (typeof v === 'string' ? v : '')
const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name.trim()

export async function POST(request: Request) {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Json
  try {
    payload = await request.json()
  } catch {
    return new Response('Bad payload', { status: 400 })
  }
  const doc = rec(payload)
  const type = str(doc?._type)
  const id = str(doc?._id)
  // Only published docs (drafts carry a `drafts.` id).
  if (!doc || !type || !id || id.startsWith('drafts.')) return Response.json({ ok: true })

  const n = (await getSiteSettings()).notifications

  if (type === 'creator') {
    if (await wasNotified('creator-live', id)) return Response.json({ ok: true, skipped: 'already' })
    const email = await ownerEmailOf(id)
    if (!email) return Response.json({ ok: true, skipped: 'no-owner' })
    const slug = str(rec(doc.slug)?.current)
    const ok = await sendEmail({
      to: email,
      subject: n.creatorPublishedSubject,
      text: fillTokens(n.creatorPublishedBody, {
        name: firstName(str(doc.name)),
        link: slug ? absoluteUrl(`/creators/${slug}`) : absoluteUrl('/creators'),
        booksLink: absoluteUrl('/join/books'),
      }),
    })
    if (ok) await markNotified('creator-live', id)
    return Response.json({ ok })
  }

  if (type === 'book') {
    if (await wasNotified('book-live', id)) return Response.json({ ok: true, skipped: 'already' })
    const creatorId = str(rec(doc.creator)?._ref)
    if (creatorId) await enqueueBook({ bookId: id, creatorId, title: str(doc.title) || 'Untitled' })
    return Response.json({ ok: true, queued: Boolean(creatorId) })
  }

  return Response.json({ ok: true, ignored: type })
}

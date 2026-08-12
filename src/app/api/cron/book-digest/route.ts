import { fillTokens, sendEmail } from '@/lib/notify-email'
import { getSiteSettings } from '@/lib/site-settings'
import { client } from '@/sanity/client'
import { ownerEmailOf } from '@/sanity/ownership-client'
import { deletePending, markNotified, pendingBooks } from '@/sanity/notify-store'

/**
 * Daily book-digest cron (Vercel cron → 06:00 UTC ≈ midnight CST). Drains the
 * queue the webhook filled during the day, groups by creator, and sends each
 * creator ONE email listing their comics that went live. Then marks + clears
 * the queue so nothing repeats.
 *
 * Guarded by CRON_SECRET (Vercel sends it as a Bearer token). Fail-soft.
 */
export const dynamic = 'force-dynamic'

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name.trim()

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const pending = await pendingBooks()
  if (pending.length === 0) return Response.json({ sent: 0, creators: 0 })

  const n = (await getSiteSettings()).notifications

  // Group the queued books by their owning creator.
  const byCreator = new Map<string, typeof pending>()
  for (const book of pending) {
    const list = byCreator.get(book.creatorId) ?? []
    list.push(book)
    byCreator.set(book.creatorId, list)
  }

  let sent = 0
  const drained: string[] = []
  for (const [creatorId, books] of byCreator) {
    const [email, creator] = await Promise.all([
      ownerEmailOf(creatorId),
      client.fetch<{ name: string | null } | null>(`*[_id==$id][0]{name}`, { id: creatorId }),
    ])
    if (email) {
      const ok = await sendEmail({
        to: email,
        subject: n.bookDigestSubject,
        text: fillTokens(n.bookDigestBody, {
          name: firstName(creator?.name ?? ''),
          count: String(books.length),
          titles: books.map((b) => `• ${b.title}`).join('\n'),
        }),
      })
      if (ok) sent += 1
    }
    // Mark + drain regardless of send success — a permanently un-owned book
    // shouldn't clog the queue forever; the once-marker also prevents re-queueing.
    for (const book of books) {
      await markNotified('book-live', book.bookId)
      drained.push(book._id)
    }
  }
  await deletePending(drained)
  return Response.json({ sent, creators: byCreator.size, books: pending.length })
}

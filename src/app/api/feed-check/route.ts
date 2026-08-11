import { fetchFeed } from '@/lib/feed-parse'

/**
 * GET /api/feed-check?url=… → { valid, title?, itemCount? }
 *
 * Backs the Studio's feed-URL validation. The Studio (a browser app) can't fetch
 * a third-party feed to check it — CORS blocks that — but this same-origin route
 * can, server-side. It returns only whether a feed was found (and a count), never
 * the feed body, to keep it from doubling as a general fetch proxy.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) {
    return Response.json({ valid: false, error: 'Missing url parameter.' }, { status: 400 })
  }

  const feed = await fetchFeed(url) // no revalidate → a live check, not a cached one
  if (!feed) return Response.json({ valid: false })

  return Response.json({ valid: true, title: feed.title, itemCount: feed.entries.length })
}

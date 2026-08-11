/**
 * Studio-side validation for a feed URL field.
 *
 * Runs in the Studio (a browser app), which can't fetch a third-party feed to
 * check it — CORS blocks that. So it delegates to /api/feed-check on our own
 * origin, which fetches and parses server-side. Returns `true` for empty
 * (the field is optional) or a valid feed, or an error string Sanity shows
 * beneath the field.
 */
export async function validateFeedUrl(value: string | undefined): Promise<true | string> {
  const url = value?.trim()
  if (!url) return true // optional

  try {
    const response = await fetch(`/api/feed-check?url=${encodeURIComponent(url)}`)
    if (!response.ok) return 'Could not check this URL right now — try again.'
    const data: unknown = await response.json()
    const valid =
      typeof data === 'object' && data !== null && (data as { valid?: unknown }).valid === true
    return valid ? true : 'No RSS or Atom feed found at this URL.'
  } catch {
    return 'Could not reach this URL to check for a feed.'
  }
}

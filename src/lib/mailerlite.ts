import 'server-only'

/**
 * MailerLite subscribe — the single place we hand an email to MailerLite.
 *
 * The address goes straight to MailerLite's API and is NEVER stored in the
 * public Sanity dataset (same reasoning as the contact + newsletter forms).
 * Double opt-in is on at the account level, so nobody joins until they confirm;
 * this call just upserts the subscriber and triggers the confirmation email.
 *
 * Env-gated (MAILERLITE_API_KEY + MAILERLITE_GROUP_ID) and fail-soft: a missing
 * key or a MailerLite hiccup returns false rather than throwing, so a caller
 * (an intake submit, the /me opt-in) is never broken by the newsletter.
 */
export async function subscribeToNewsletter(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase()
  const apiKey = process.env.MAILERLITE_API_KEY
  const groupId = process.env.MAILERLITE_GROUP_ID
  if (!clean) return false
  if (!apiKey || !groupId) {
    console.error('[mailerlite] MAILERLITE_API_KEY / MAILERLITE_GROUP_ID not set')
    return false
  }

  try {
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // MailerLite upserts on email and returns 200/201 (including for an
      // already-subscribed address), so a repeat signup still reads as success.
      body: JSON.stringify({ email: clean, groups: [groupId] }),
    })
    if (!res.ok) {
      console.error('[mailerlite] responded', res.status, await res.text())
      return false
    }
    return true
  } catch (cause) {
    console.error('[mailerlite] request failed', cause)
    return false
  }
}

/**
 * Whether `email` is an active (confirmed) ND Noise subscriber — used to hide
 * the /me opt-in from people who already joined. MailerLite is the sole source
 * of truth (no local marker to drift), so this reads it live via the connect
 * API (which accepts the email as the subscriber identifier).
 *
 * Fail-SOFT toward showing the invite: a missing key, a 404 (not a subscriber),
 * an unconfirmed/unsubscribed status, or any hiccup all return false, so the
 * worst case is that a subscriber occasionally still sees the opt-in — never
 * that a non-subscriber is denied the chance to join.
 */
export async function isSubscribedToNewsletter(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase()
  const apiKey = process.env.MAILERLITE_API_KEY
  if (!clean || !apiKey) return false

  try {
    const res = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(clean)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } },
    )
    if (!res.ok) return false // 404 = not a subscriber; any other error → fail soft
    const body: unknown = await res.json()
    const status = (body as { data?: { status?: unknown } })?.data?.status
    // 'active' = confirmed + subscribed; unconfirmed/unsubscribed/bounced/junk
    // all mean we should still invite them.
    return status === 'active'
  } catch (cause) {
    console.error('[mailerlite] status check failed', cause)
    return false
  }
}

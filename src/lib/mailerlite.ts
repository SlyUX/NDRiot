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

'use server'

import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'

/**
 * Newsletter signup → MailerLite.
 *
 * The email goes straight to MailerLite's API and is NEVER stored in Sanity —
 * the production dataset is public-read, so a subscriber list living there
 * would be readable by anyone (same reasoning as the contact form). Double
 * opt-in is on at the MailerLite account level, so nobody joins until they
 * confirm; the API call just triggers the confirmation email.
 *
 * Env-gated: MAILERLITE_API_KEY + MAILERLITE_GROUP_ID. Absent → the feature
 * fails closed with a generic error (our problem, not the subscriber's).
 */

export type NewsletterState = {
  status: 'idle' | 'success' | 'error'
  /** A specific error (bad email); otherwise the form shows the CMS errorMessage. */
  message?: string
  /** Echoed back so the field survives a failed submit, JS or no JS. */
  email?: string
}

/** Deliberately loose — the only address that matters is one MailerLite accepts. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  // Silent-drop bots — a caught bot that sees an error just adapts.
  if (honeypotTripped(formData)) return { status: 'success' }
  if (submittedTooFast(formData)) return { status: 'success' }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!email) return { status: 'error', message: 'Please add your email.', email }
  if (!EMAIL.test(email)) return { status: 'error', message: 'That email doesn’t look right.', email }

  if (await rateLimited('newsletter')) {
    return { status: 'error', message: 'Too many attempts just now. Give it a few minutes.', email }
  }

  const apiKey = process.env.MAILERLITE_API_KEY
  const groupId = process.env.MAILERLITE_GROUP_ID
  if (!apiKey || !groupId) {
    console.error('[newsletter] MAILERLITE_API_KEY / MAILERLITE_GROUP_ID not set')
    return { status: 'error', email }
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
      body: JSON.stringify({ email, groups: [groupId] }),
    })
    if (!res.ok) {
      console.error('[newsletter] MailerLite responded', res.status, await res.text())
      return { status: 'error', email }
    }
  } catch (cause) {
    console.error('[newsletter] request failed', cause)
    return { status: 'error', email }
  }

  return { status: 'success' }
}

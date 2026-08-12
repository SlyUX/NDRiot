'use server'

import { honeypotTripped, rateLimited, submittedTooFast } from '@/lib/intake/anti-spam'
import { subscribeToNewsletter } from '@/lib/mailerlite'

/**
 * Newsletter signup → MailerLite (the public homepage/footer band).
 *
 * This action owns the public-form concerns — honeypot, timing, rate limit,
 * email validation, echoing the field back on error. The actual MailerLite
 * hand-off lives in `subscribeToNewsletter` (src/lib/mailerlite.ts), shared with
 * the intake forms and the /me opt-in. Double opt-in is on at the account level,
 * so nobody joins until they confirm; the call just triggers that email.
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

  if (!(await subscribeToNewsletter(email))) {
    // Env not set or MailerLite rejected — our problem, not the subscriber's.
    return { status: 'error', email }
  }

  return { status: 'success' }
}

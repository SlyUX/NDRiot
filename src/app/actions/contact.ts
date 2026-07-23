'use server'

import { headers } from 'next/headers'

/**
 * Contact form handler.
 *
 * Email only, on purpose. The obvious "also save it to Sanity" is unsafe here:
 * the production dataset is public-read (the whole site queries it without a
 * token), so a stranger's message and address stored as a document would be
 * readable by anyone who asks. A message sent to us is ours to receive, not to
 * publish. If an auditable store is ever wanted, it belongs in a separate
 * PRIVATE dataset, not this one.
 *
 * Delivery is Resend over its REST API — a single POST, so no SDK dependency.
 * Nothing here runs until the three env vars exist, which is deliberate: the
 * feature ships with its configuration or not at all.
 */

export type ContactState = {
  status: 'idle' | 'success' | 'error'
  /** A general message — success text, or a reason it failed. */
  message?: string
  /** Per-field problems, keyed by field name, for inline display. */
  fieldErrors?: Partial<Record<'name' | 'email' | 'message', string>>
  /** Echoed back so the form repopulates on error, JS or no JS. */
  values?: { name: string; email: string; subject: string; message: string }
}

const LIMITS = { name: 100, subject: 150, message: 5000 }
const MIN_MESSAGE = 10

/** Deliberately loose. The only email that matters is one we can reply to, and
 *  an over-strict pattern rejects valid addresses more often than it blocks
 *  junk. Real validation is whether the reply bounces. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Best-effort rate limit. In-memory and per-instance, so on serverless it only
 * catches a bot hammering one warm instance — real protection needs a shared
 * store (Vercel KV / Upstash), which is the follow-up if abuse appears. The
 * honeypot and timing gate below do most of the work; this is a backstop.
 */
const hits = new Map<string, number[]>()
const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 5

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    subject: String(formData.get('subject') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
  }

  // Honeypot: a field hidden from people, tempting to bots. Filled means a bot.
  // Return success rather than an error — a bot that learns it was caught just
  // adapts, so we tell it nothing and drop the message silently.
  if (String(formData.get('company') ?? '')) {
    return { status: 'success' }
  }

  // Timing gate: the render time is stamped into a hidden field. A submission
  // faster than a person could plausibly type is a script. Same silent drop.
  const started = Number(formData.get('t'))
  if (Number.isFinite(started) && Date.now() - started < 2_000) {
    return { status: 'success' }
  }

  const fieldErrors: NonNullable<ContactState['fieldErrors']> = {}
  if (!values.name) fieldErrors.name = 'Please add your name.'
  else if (values.name.length > LIMITS.name) fieldErrors.name = 'That name is too long.'
  if (!values.email) fieldErrors.email = 'Please add an email so we can reply.'
  else if (!EMAIL.test(values.email)) fieldErrors.email = 'That email doesn’t look right.'
  if (!values.message) fieldErrors.message = 'Please write a message.'
  else if (values.message.length < MIN_MESSAGE) fieldErrors.message = 'A little more detail, please.'
  else if (values.message.length > LIMITS.message) fieldErrors.message = 'That message is very long — please trim it.'

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors, values }
  }

  const ip =
    (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) {
    return {
      status: 'error',
      message: 'Too many messages just now. Give it a few minutes.',
      values,
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  const to = process.env.CONTACT_INBOX
  if (!apiKey || !from || !to) {
    // Missing config is our problem, not the sender's — do not imply their
    // message was malformed. Loud on the server so it is caught before launch.
    console.error('[contact] RESEND_API_KEY / CONTACT_FROM / CONTACT_INBOX not set')
    return { status: 'error', values }
  }

  const subject = values.subject || 'New message'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        // So a plain Reply goes to the sender, not to the no-reply from-address.
        reply_to: values.email,
        subject: `[ND Riot] ${subject}`,
        text: `From: ${values.name} <${values.email}>\nSubject: ${subject}\n\n${values.message}`,
      }),
    })
    if (!res.ok) {
      console.error('[contact] Resend responded', res.status, await res.text())
      return { status: 'error', values }
    }
  } catch (cause) {
    console.error('[contact] send failed', cause)
    return { status: 'error', values }
  }

  return { status: 'success' }
}

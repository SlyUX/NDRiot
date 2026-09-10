import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Stateless unsubscribe tokens for ND Noise. Because the digest is sent via
 * Resend (not a MailerLite broadcast), we own the unsubscribe link — a token
 * that carries the subscriber's email, signed with a server secret so it can't
 * be forged for an arbitrary address, and needs no stored table.
 *
 * Format: base64url(email) + "." + base64url(HMAC-SHA256(email)). Verification
 * recomputes the MAC and compares in constant time.
 */

function secret(): string | null {
  return process.env.AUTH_SECRET ?? process.env.CRON_SECRET ?? null
}

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function mac(email: string, key: string): string {
  return b64url(createHmac('sha256', key).update(email).digest())
}

/** A signed unsubscribe token for `email`, or null if no secret is configured. */
export function signUnsubscribe(email: string): string | null {
  const key = secret()
  if (!key) return null
  const clean = email.trim().toLowerCase()
  const payload = b64url(Buffer.from(clean, 'utf8'))
  return `${payload}.${mac(clean, key)}`
}

/** The email a valid token carries, or null if it's malformed/forged. */
export function verifyUnsubscribe(token: string): string | null {
  const key = secret()
  if (!key) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  let email: string
  try {
    email = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  } catch {
    return null
  }
  const expected = mac(email, key)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return email
}

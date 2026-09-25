import 'server-only'

import { createHash, createHmac } from 'node:crypto'

/**
 * Email hashing for the private auth dataset.
 *
 * We never store a reader's plaintext email next to what they do. The identity
 * key is an HMAC of the normalized email under a server secret — unlike a bare
 * SHA-256, an HMAC can't be brute-forced from a known mailing list, because the
 * attacker doesn't have the secret. The account doc, and (after the migration)
 * follow records, are keyed this way.
 *
 * `legacySaveSha` reproduces the OLD bare-SHA-256 scheme used by reader saves,
 * for the dual-read migration window only — see the migration script.
 *
 * The secret is long-lived: rotating it re-keys everything (you can't recompute
 * new keys from old), so it lives in ND_RIOT_HASH_SECRET and is treated as
 * permanent. Set it in .env.local and Vercel before anything writes an account.
 */

function secret(): string {
  const s = process.env.ND_RIOT_HASH_SECRET
  if (!s) {
    throw new Error(
      'Missing ND_RIOT_HASH_SECRET — required to key accounts/follows. Set it in the environment.',
    )
  }
  return s
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase()

/** HMAC-SHA256(normalized email) — the identity key for an account. */
export function emailHmac(email: string): string {
  return createHmac('sha256', secret()).update(normalizeEmail(email)).digest('hex')
}

/** HMAC-SHA256(normalized email + item id) — the follow/save key (post-migration). */
export function saveHmac(email: string, itemId: string): string {
  return createHmac('sha256', secret())
    .update(`${normalizeEmail(email)}::${itemId}`)
    .digest('hex')
}

/**
 * LEGACY key for reader saves: `sha256(email::itemId)`, first 40 hex chars, as
 * `reader-client` wrote them. Used ONLY to find-and-migrate old records during
 * the dual-read window; do not write new records with this.
 */
export function legacySaveSha(email: string, itemId: string): string {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}::${itemId}`)
    .digest('hex')
    .slice(0, 40)
}

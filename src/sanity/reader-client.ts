import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { emailHmac, normalizeEmail, saveHmac } from '@/lib/email-hash'

import { apiVersion, projectId } from './env'

/**
 * Reader saves — a signed-in reader's explicitly bookmarked comics and makers.
 *
 * Same private-dataset + token model as the ownership map (ownership-client.ts):
 * stored in `ndriot_auth`, never the world-readable `production` dataset.
 *
 * PRIVACY (upgraded 2026-09-25): a save doc stores NO plaintext email — only
 * `emailHmac` (HMAC-SHA256 of the email, not brute-forceable from a mailing
 * list the way a bare SHA-256 is) — and its `_id` is an HMAC of email+item, so
 * the key can't be guessed to confirm "does X follow Y". This is what makes the
 * privacy policy's "keyed to a one-way hash, not your email beside the list"
 * true. Each save is its own tiny doc, so add/remove are idempotent.
 *
 * AGENTS.md §3: explicit personalisation ONLY. Saves serve the reader; they are
 * never aggregated into "popular" / "most-saved" or any ranking.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — reader client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

export type SavedItemType = 'book' | 'creator' | 'strip'
export interface SavedItem {
  itemType: SavedItemType
  itemId: string
}

/** A deterministic, _id-safe document id from (email, itemId) — HMAC-keyed. */
function saveId(email: string, itemId: string): string {
  return `save.${saveHmac(email, itemId)}`
}

/** Every item this reader has saved. Fail-soft to none, like the ownership map. */
export async function savedItems(email: string): Promise<SavedItem[]> {
  const owner = normalizeEmail(email)
  if (!owner) return []
  try {
    return (
      (await client().fetch<SavedItem[]>(
        `*[_type=="readerSave" && emailHmac==$hmac]{itemType, itemId}`,
        { hmac: emailHmac(owner) },
      )) ?? []
    )
  } catch (cause) {
    console.error('[reader] savedItems failed', cause)
    return []
  }
}

/** Whether this reader has saved this item. Fail-soft to false. */
export async function isSaved(email: string, itemId: string): Promise<boolean> {
  const owner = normalizeEmail(email)
  if (!owner || !itemId) return false
  try {
    const found = await client().fetch<string | null>(`*[_id==$id][0]._id`, {
      id: saveId(owner, itemId),
    })
    return Boolean(found)
  } catch (cause) {
    console.error('[reader] isSaved failed', cause)
    return false
  }
}

/** Toggle a save; returns the resulting saved state (true = now saved). */
export async function toggleSave(
  email: string,
  itemType: SavedItemType,
  itemId: string,
): Promise<boolean> {
  const owner = normalizeEmail(email)
  if (!owner || !itemId) return false
  const id = saveId(owner, itemId)
  if (await isSaved(owner, itemId)) {
    await client().delete(id)
    return false
  }
  await client().createIfNotExists({
    _id: id,
    _type: 'readerSave',
    emailHmac: emailHmac(owner),
    itemType,
    itemId,
  })
  return true
}

/** Remove a save outright (idempotent) — the dashboard's destructive control. */
export async function unsaveItem(email: string, itemId: string): Promise<void> {
  const owner = normalizeEmail(email)
  if (!owner || !itemId) return
  try {
    await client().delete(saveId(owner, itemId))
  } catch (cause) {
    console.error('[reader] unsave failed', cause)
  }
}

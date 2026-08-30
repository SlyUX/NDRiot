import 'server-only'

import { createHash } from 'node:crypto'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * Reader saves — a signed-in reader's explicitly bookmarked comics and makers.
 *
 * Same private-dataset + token model as the ownership map (ownership-client.ts):
 * stored in `ndriot_auth`, never the world-readable `production` dataset,
 * because these tie a person's email to what they read (PII). No Studio schema
 * is needed — plain data documents written and read over the API. Each save is
 * its own tiny document, so adding and removing are idempotent create/delete
 * with no read-modify-write races.
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

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export type SavedItemType = 'book' | 'creator' | 'strip'
export interface SavedItem {
  itemType: SavedItemType
  itemId: string
}

/** A deterministic, _id-safe document id from (email, itemId). */
function saveId(email: string, itemId: string): string {
  const hash = createHash('sha256').update(`${normalizeEmail(email)}::${itemId}`).digest('hex')
  return `save.${hash.slice(0, 40)}`
}

/** Every item this reader has saved. Fail-soft to none, like the ownership map. */
export async function savedItems(email: string): Promise<SavedItem[]> {
  const owner = normalizeEmail(email)
  if (!owner) return []
  try {
    return (
      (await client().fetch<SavedItem[]>(`*[_type=="readerSave" && email==$email]{itemType, itemId}`, {
        email: owner,
      })) ?? []
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
  await client().createIfNotExists({ _id: id, _type: 'readerSave', email: owner, itemType, itemId })
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

import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * The ownership map: which verified email may edit which creator document.
 *
 * Lives in a SEPARATE, PRIVATE Sanity dataset (default `ownership`) in the same
 * project — never in the public `production` dataset, because a creator's email
 * is PII and production is world-readable. Same project means the existing
 * write token reaches it; private visibility means only the token can read it.
 *
 * No Studio schema is needed — these are plain data documents written and read
 * over the API, effectively a key-value store keyed by creator id (one owner
 * per creator). Server-only: the token must never reach the browser.
 */

// The private dataset holding the ownership map. Overridable via env, defaulting
// to the provisioned `ndriot_auth` dataset so no extra Vercel var is required.
const OWNERSHIP_DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) {
    throw new Error('Missing SANITY_WRITE_TOKEN / CREATOR_SCRIPT — ownership client cannot be created.')
  }
  cached = createClient({
    projectId,
    dataset: OWNERSHIP_DATASET,
    apiVersion,
    useCdn: false,
    token,
  })
  return cached
}

// Google emails are case-insensitive in practice; normalise so a match holds
// regardless of how the address was typed at intake.
const normalizeEmail = (email: string) => email.trim().toLowerCase()

/**
 * Record that `email` owns `creatorId`. One owner per creator (id keyed by the
 * creator), so this is a create-or-replace — set once at creation, or by the
 * admin-approved claim flow. Never called on a plain update.
 */
export async function recordOwnership(email: string, creatorId: string): Promise<void> {
  const owner = normalizeEmail(email)
  if (!owner || !creatorId) return
  await client().createOrReplace({
    _id: `ownership-${creatorId}`,
    _type: 'ownership',
    email: owner,
    creatorId,
  })
}

/**
 * The creator ids this verified email is allowed to edit. Resilient: a missing
 * or unreachable ownership dataset returns none rather than crashing the page
 * that renders the picker (the store isn't provisioned until launch).
 */
export async function creatorsOwnedBy(email: string): Promise<string[]> {
  const owner = normalizeEmail(email)
  if (!owner) return []
  try {
    return (
      (await client().fetch<string[]>(`*[_type=="ownership" && email==$email].creatorId`, {
        email: owner,
      })) ?? []
    )
  } catch (cause) {
    console.error('[ownership] creatorsOwnedBy failed', cause)
    return []
  }
}

/**
 * Whether this verified email owns this creator — the update gate. Fail-CLOSED:
 * any error denies the edit rather than allowing it.
 */
export async function ownsCreator(email: string, creatorId: string): Promise<boolean> {
  const owner = normalizeEmail(email)
  if (!owner || !creatorId) return false
  try {
    const onFile = await client().fetch<string | null>(
      `*[_type=="ownership" && _id==$id][0].email`,
      { id: `ownership-${creatorId}` },
    )
    return onFile === owner
  } catch (cause) {
    console.error('[ownership] ownsCreator failed', cause)
    return false
  }
}

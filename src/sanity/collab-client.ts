import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * Collaboration requests — the creator-to-creator collab handshake.
 *
 * Same private-dataset + token model as the ownership map and reader saves
 * (ownership-client.ts / reader-client.ts): stored in `ndriot_auth`, never the
 * world-readable `production` dataset, because a request ties a creator's email
 * to who they reached out to (PII). No Studio schema — plain data documents over
 * the API.
 *
 * The id is deterministic per ORDERED pair (from → to), which is the whole
 * enforcement of "one request per creator, ever": a second attempt resolves to
 * the same id and is refused. A decline or silence therefore cannot be followed
 * by another ask — no pestering, by construction. There is no free text on
 * either side (the request carries a chosen genre; the reply is a canned value),
 * so there is nothing to moderate.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — collab client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export type CollabStatus = 'pending' | 'accepted' | 'maybe' | 'declined'

export interface CollabRequest {
  _id: string
  fromId: string
  toId: string
  genre: string | null
  status: CollabStatus
  response: string | null
  createdAt: string | null
  respondedAt: string | null
}

/** Deterministic, _id-safe document id for the ordered pair (from → to). */
function collabId(fromId: string, toId: string): string {
  return `collab.${fromId}__${toId}`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

/**
 * The request this creator has already sent that one — or null. Drives the
 * profile button state and the "one request, ever" gate.
 */
export async function sentRequest(fromId: string, toId: string): Promise<CollabRequest | null> {
  if (!fromId || !toId) return null
  try {
    return await client().fetch<CollabRequest | null>(`*[_id==$id][0]`, {
      id: collabId(fromId, toId),
    })
  } catch (cause) {
    console.error('[collab] sentRequest failed', cause)
    return null
  }
}

/**
 * Record a new request. `create` (not createOrReplace) is the gate: a second
 * request to the same creator hits the existing id and is refused as `exists`,
 * so it can never overwrite or re-open a prior one.
 */
export async function createCollabRequest(input: {
  fromId: string
  fromEmail: string
  toId: string
  genre: string
  createdAt: string
}): Promise<'created' | 'exists' | 'error'> {
  const fromEmail = normalizeEmail(input.fromEmail)
  if (!input.fromId || !input.toId || !fromEmail) return 'error'
  try {
    await client().create({
      _id: collabId(input.fromId, input.toId),
      _type: 'collabRequest',
      fromId: input.fromId,
      toId: input.toId,
      fromEmail,
      genre: input.genre,
      status: 'pending',
      createdAt: input.createdAt,
    })
    return 'created'
  } catch (cause) {
    // A duplicate id (the one-request gate) surfaces as a conflict; anything
    // else is a real error. Either way we did not create a fresh request.
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/already exists|conflict|409/i.test(message)) return 'exists'
    console.error('[collab] createCollabRequest failed', cause)
    return 'error'
  }
}

export type RespondResult =
  | { result: 'missing' }
  | { result: 'terminal' }
  | { result: 'unchanged'; fromEmail: string; genre: string | null }
  | { result: 'updated'; fromEmail: string; genre: string | null }

/**
 * Apply a canned response. `pending` and `maybe` can still change — a "maybe
 * later" is a genuine deferred state the recipient can later upgrade to "yes"
 * (or close out), which is what makes it more than a dead end. `accepted` and
 * `declined` are terminal. `unchanged` (re-picking the same option) is a no-op
 * so the requester isn't re-notified. The caller has verified ownership of `toId`.
 */
export async function respondToCollabRequest(input: {
  fromId: string
  toId: string
  status: CollabStatus
  response: string
  respondedAt: string
}): Promise<RespondResult> {
  const id = collabId(input.fromId, input.toId)
  try {
    const existing = await client().fetch<{
      status: CollabStatus
      fromEmail: string
      genre: string | null
    } | null>(`*[_id==$id][0]{status, fromEmail, genre}`, { id })
    if (!existing) return { result: 'missing' }
    if (existing.status === 'accepted' || existing.status === 'declined')
      return { result: 'terminal' }
    if (existing.status === input.status)
      return { result: 'unchanged', fromEmail: existing.fromEmail, genre: existing.genre }
    await client()
      .patch(id)
      .set({ status: input.status, response: input.response, respondedAt: input.respondedAt })
      .commit()
    return { result: 'updated', fromEmail: existing.fromEmail, genre: existing.genre }
  } catch (cause) {
    console.error('[collab] respondToCollabRequest failed', cause)
    return { result: 'missing' }
  }
}

/** Requests sent TO this creator, newest first — the /me "respond" list. */
export async function incomingRequests(toId: string): Promise<CollabRequest[]> {
  if (!toId) return []
  try {
    return (
      (await client().fetch<CollabRequest[]>(
        `*[_type=="collabRequest" && toId==$toId] | order(createdAt desc)`,
        { toId },
      )) ?? []
    )
  } catch (cause) {
    console.error('[collab] incomingRequests failed', cause)
    return []
  }
}

/** Requests this creator has SENT, newest first — the /me "status" list. */
export async function sentRequests(fromId: string): Promise<CollabRequest[]> {
  if (!fromId) return []
  try {
    return (
      (await client().fetch<CollabRequest[]>(
        `*[_type=="collabRequest" && fromId==$fromId] | order(createdAt desc)`,
        { fromId },
      )) ?? []
    )
  } catch (cause) {
    console.error('[collab] sentRequests failed', cause)
    return []
  }
}

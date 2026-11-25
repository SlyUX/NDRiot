import 'server-only'

import { randomBytes } from 'node:crypto'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * Credit claim links — the shareable-link side of inviting a collaborator who
 * isn't on ND Riot yet (Phase 3). The owner generates a one-time link for a
 * plain-name credit and sends it however they like; ND Riot never collects or
 * emails the invitee's address. The invitee opens the link, signs in, and
 * claims the credit as their creator — which relinks the credit to them.
 *
 * Stored in the private `ndriot_auth` dataset (same client pattern as
 * ownership/collab), keyed by a RANDOM token so the link is unguessable — the
 * bookId + creditKey it points at are public, so the secret is the token. No
 * PII: the doc holds only public references plus a snapshot for display.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — credit-claim client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

export type CreditClaimStatus = 'open' | 'claimed' | 'revoked'

export interface CreditClaim {
  _id: string
  token: string
  bookId: string
  creditKey: string
  roles: string[] | null
  name: string | null
  inviterId: string | null
  status: CreditClaimStatus
  claimedByCreatorId: string | null
  createdAt: string | null
  claimedAt: string | null
}

/**
 * The open claim link for one credit, created if absent — so re-generating
 * returns the SAME link rather than sprawling tokens. Fail-soft to null.
 */
export async function getOrCreateClaim(input: {
  bookId: string
  creditKey: string
  roles: string[]
  name: string
  inviterId: string
}): Promise<CreditClaim | null> {
  try {
    const existing = await client().fetch<CreditClaim | null>(
      `*[_type=="creditClaim" && bookId==$b && creditKey==$k && status=="open"][0]`,
      { b: input.bookId, k: input.creditKey },
    )
    if (existing) return existing
    const token = randomBytes(16).toString('hex')
    const doc: CreditClaim = {
      _id: `creditclaim.${token}`,
      token,
      bookId: input.bookId,
      creditKey: input.creditKey,
      roles: input.roles,
      name: input.name,
      inviterId: input.inviterId,
      status: 'open',
      claimedByCreatorId: null,
      createdAt: new Date().toISOString(),
      claimedAt: null,
    }
    await client().create({ ...doc, _type: 'creditClaim' })
    return doc
  } catch (cause) {
    console.error('[credit-claim] getOrCreateClaim failed', cause)
    return null
  }
}

/** Resolve a claim by its token (the link). Fail-soft to null. */
export async function getClaim(token: string): Promise<CreditClaim | null> {
  if (!token) return null
  try {
    return await client().fetch<CreditClaim | null>(
      `*[_type=="creditClaim" && token==$t][0]`,
      { t: token },
    )
  } catch (cause) {
    console.error('[credit-claim] getClaim failed', cause)
    return null
  }
}

/** Mark a claim claimed (one-time). Returns false if it wasn't still open. */
export async function markClaimed(token: string, creatorId: string): Promise<boolean> {
  try {
    const claim = await client().fetch<{ _id: string; status: CreditClaimStatus } | null>(
      `*[_type=="creditClaim" && token==$t][0]{_id,status}`,
      { t: token },
    )
    if (!claim || claim.status !== 'open') return false
    await client()
      .patch(claim._id)
      .set({ status: 'claimed', claimedByCreatorId: creatorId, claimedAt: new Date().toISOString() })
      .commit()
    return true
  } catch (cause) {
    console.error('[credit-claim] markClaimed failed', cause)
    return false
  }
}

import 'server-only'

import { ownerEmailOf } from '@/sanity/ownership-client'
import { isSaved, savedItems } from '@/sanity/reader-client'

/**
 * A Cosign is a MUTUAL follow between two creators — A cosigns B exactly when A
 * follows B and B follows A. It's derived, never stored: reciprocation is what
 * earns the word, so it can't be gamed one-sidedly, and because both parties
 * opted in by following, a mutual pair is safe to show publicly on a profile.
 * A one-way follow stays private (the reader's feed only).
 *
 * `mutualCosignIds` returns the creator ids that mutually follow `creatorId`.
 * Server-only: it reads the private save store + the ownership map (to resolve
 * each creator's owner email). Fail-soft to none.
 *
 * Cost is O(follows) existence checks — fine at this scale; batch later if a
 * creator follows very many.
 */
export type FollowSignal = 'mutual' | 'follows-you' | 'none'

/**
 * The PRIVATE relationship signal shown only to a message recipient evaluating a
 * request: does the requester follow them, and is it mutual (a Cosign)? A one-way
 * "follows you" is never public — it surfaces here, to the recipient alone, as
 * trust context. `meEmail` is passed in (the caller already has it) to save a
 * lookup. Fail-soft to 'none'.
 */
export async function followSignal(
  requesterId: string,
  meId: string,
  meEmail: string,
): Promise<FollowSignal> {
  if (!requesterId || !meId || !meEmail) return 'none'
  try {
    const requesterEmail = await ownerEmailOf(requesterId)
    if (!requesterEmail) return 'none'
    const [theyFollowMe, iFollowThem] = await Promise.all([
      isSaved(requesterEmail, meId),
      isSaved(meEmail, requesterId),
    ])
    if (theyFollowMe && iFollowThem) return 'mutual'
    if (theyFollowMe) return 'follows-you'
    return 'none'
  } catch (cause) {
    console.error('[cosign] followSignal failed', cause)
    return 'none'
  }
}

export async function mutualCosignIds(creatorId: string): Promise<string[]> {
  if (!creatorId) return []
  try {
    const email = await ownerEmailOf(creatorId)
    if (!email) return []

    const followedCreatorIds = (await savedItems(email))
      .filter((s) => s.itemType === 'creator')
      .map((s) => s.itemId)
    if (followedCreatorIds.length === 0) return []

    const checks = await Promise.all(
      followedCreatorIds.map(async (otherId) => {
        // You can't cosign yourself — guard the stray self-follows that early
        // testing left in the save store (the UI never offers a self-follow).
        if (otherId === creatorId) return null
        const otherEmail = await ownerEmailOf(otherId)
        if (!otherEmail) return null
        return (await isSaved(otherEmail, creatorId)) ? otherId : null
      }),
    )
    return checks.filter((id): id is string => id !== null)
  } catch (cause) {
    console.error('[cosign] mutualCosignIds failed', cause)
    return []
  }
}

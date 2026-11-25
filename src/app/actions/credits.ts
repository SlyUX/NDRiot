'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { creatorsOwnedBy } from '@/sanity/ownership-client'
import { getClaim, getOrCreateClaim, markClaimed } from '@/sanity/credit-claim-client'
import { getWriteClient } from '@/sanity/write-client'
import { absoluteUrl } from '@/lib/site-url'
import type { SanityClient } from 'next-sanity'

/**
 * Credit confirmations — the collaborator's side of the credit loop (Phase 3).
 *
 * A linked credit an owner adds starts `confirmed:false`: it shows on the comic
 * page but NOT on the credited creator's profile. Here that creator (and only
 * they) accepts it (→ confirmed, reaches their profile) or declines it (→ the
 * credit is removed from the comic). Gated by ownership of the linked creator,
 * so one creator can never flip or remove another's credit.
 *
 * Writes directly to the comic (production dataset) — this is the collaborator's
 * own consent, not an owner edit, so it doesn't go through the review-draft
 * pipeline. Any pending owner draft is patched too, so a later publish can't
 * silently undo the decision.
 */

type CreditResult = { ok: boolean; error?: string }

/** _keys of this book's credits that link one of `owned` and aren't yet confirmed. */
async function pendingKeysFor(
  client: SanityClient,
  id: string,
  owned: ReadonlySet<string>,
): Promise<string[]> {
  const doc = await client.fetch<{
    credits?: { _key: string; ref?: string | null; confirmed?: boolean | null }[]
  } | null>(`*[_id==$id][0]{credits[]{_key,"ref":creator._ref,confirmed}}`, { id })
  return (doc?.credits ?? [])
    .filter((c) => c.ref && owned.has(c.ref) && c.confirmed !== true)
    .map((c) => c._key)
}

async function mutateMyCredits(
  bookId: string,
  mode: 'confirm' | 'decline',
): Promise<CreditResult> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false, error: 'Your session expired — please sign in again.' }

  // A published comic id only (the inbox never surfaces drafts).
  if (!bookId || bookId.startsWith('drafts.')) return { ok: false, error: 'Unknown comic.' }

  const owned = new Set(await creatorsOwnedBy(email))
  if (owned.size === 0) return { ok: false, error: 'No creator profile on this account.' }

  let client: SanityClient
  try {
    client = getWriteClient()
  } catch {
    return { ok: false, error: 'Temporarily unavailable — please try again shortly.' }
  }

  // Patch the published comic and any pending owner draft the same way, so the
  // decision survives a later publish of that draft.
  const ids = [bookId, `drafts.${bookId}`]
  let touched = false
  try {
    for (const id of ids) {
      const keys = await pendingKeysFor(client, id, owned)
      if (keys.length === 0) continue
      const patch = client.patch(id)
      if (mode === 'confirm') {
        patch.set(Object.fromEntries(keys.map((k) => [`credits[_key=="${k}"].confirmed`, true])))
      } else {
        patch.unset(keys.map((k) => `credits[_key=="${k}"]`))
      }
      await patch.commit()
      touched = true
    }
  } catch (cause) {
    console.error('[credits] mutate failed', cause)
    return { ok: false, error: 'Something went wrong — please try again.' }
  }

  if (!touched) return { ok: false, error: 'That credit is no longer waiting on you.' }

  revalidatePath('/me')
  revalidatePath('/creators/[slug]', 'page')
  revalidatePath('/comics/[slug]', 'page')
  return { ok: true }
}

/** Accept every credit on this comic that links one of your creators. */
export async function confirmCredit(bookId: string): Promise<CreditResult> {
  return mutateMyCredits(bookId, 'confirm')
}

/** Remove every unconfirmed credit on this comic that links one of your creators. */
export async function declineCredit(bookId: string): Promise<CreditResult> {
  return mutateMyCredits(bookId, 'decline')
}

type ClaimLinkResult = { ok: true; url: string } | { ok: false; error: string }

/**
 * Owner generates (or re-fetches) the shareable claim link for a plain-name
 * credit on a comic they own. The credit must be PUBLISHED and still a plain
 * name — a claim link for a linked or unpublished credit makes no sense.
 */
export async function createCreditClaim(
  bookId: string,
  creditKey: string,
): Promise<ClaimLinkResult> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false, error: 'Your session expired — please sign in again.' }
  if (!bookId || bookId.startsWith('drafts.') || !creditKey)
    return { ok: false, error: 'Unknown credit.' }

  const owned = new Set(await creatorsOwnedBy(email))
  if (owned.size === 0) return { ok: false, error: 'No creator profile on this account.' }

  let client: SanityClient
  try {
    client = getWriteClient()
  } catch {
    return { ok: false, error: 'Temporarily unavailable — please try again shortly.' }
  }

  // The comic must exist (published), the viewer must own its creator, and the
  // target credit must still be a plain name (no linked creator).
  const book = await client.fetch<{
    ownerId?: string | null
    credit?: { name?: string | null; roles?: string[] | null; hasCreator?: boolean } | null
  } | null>(
    `*[_id==$id][0]{"ownerId":creator._ref,"credit":credits[_key==$k][0]{name,roles,"hasCreator":defined(creator)}}`,
    { id: bookId, k: creditKey },
  )
  if (!book) return { ok: false, error: 'That comic isn’t published yet.' }
  if (!book.ownerId || !owned.has(book.ownerId))
    return { ok: false, error: 'You can only invite collaborators on a comic you own.' }
  if (!book.credit) return { ok: false, error: 'That credit isn’t published yet.' }
  if (book.credit.hasCreator)
    return { ok: false, error: 'That collaborator is already linked.' }

  const claim = await getOrCreateClaim({
    bookId,
    creditKey,
    roles: book.credit.roles ?? [],
    name: book.credit.name ?? '',
    inviterId: book.ownerId,
  })
  if (!claim) return { ok: false, error: 'Couldn’t create the link — please try again.' }

  return { ok: true, url: absoluteUrl(`/claim/${claim.token}`) }
}

/**
 * The invitee claims a credit via its link, as one of their creators. Claiming
 * IS consent, so the credit is linked AND confirmed in one step (it skips the
 * inbox). Relinks the plain-name credit (by _key) on the published comic and any
 * pending draft: sets the creator reference, confirmed:true, and clears name.
 */
export async function claimCredit(token: string): Promise<CreditResult> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false, error: 'Your session expired — please sign in again.' }

  const owned = await creatorsOwnedBy(email)
  if (owned.length === 0)
    return { ok: false, error: 'Create your creator profile first, then open this link again.' }
  const creatorId = owned[0]

  const claim = await getClaim(token)
  if (!claim || claim.status !== 'open')
    return { ok: false, error: 'This claim link is no longer valid.' }

  let client: SanityClient
  try {
    client = getWriteClient()
  } catch {
    return { ok: false, error: 'Temporarily unavailable — please try again shortly.' }
  }

  // Relink the plain-name credit by _key on the published comic + any draft.
  // Only touch a credit that is still a plain name (not already linked).
  let touched = false
  try {
    for (const id of [claim.bookId, `drafts.${claim.bookId}`]) {
      const doc = await client.fetch<{
        credits?: { _key: string; hasCreator?: boolean }[]
      } | null>(`*[_id==$id][0]{credits[]{_key,"hasCreator":defined(creator)}}`, { id })
      const match = (doc?.credits ?? []).find(
        (c) => c._key === claim.creditKey && !c.hasCreator,
      )
      if (!match) continue
      await client
        .patch(id)
        .set({
          [`credits[_key=="${claim.creditKey}"].creator`]: {
            _type: 'reference',
            _ref: creatorId,
          },
          [`credits[_key=="${claim.creditKey}"].confirmed`]: true,
        })
        .unset([`credits[_key=="${claim.creditKey}"].name`])
        .commit()
      touched = true
    }
  } catch (cause) {
    console.error('[credits] claim relink failed', cause)
    return { ok: false, error: 'Something went wrong — please try again.' }
  }

  if (!touched) return { ok: false, error: 'This credit is no longer available to claim.' }

  await markClaimed(token, creatorId)
  revalidatePath('/me')
  revalidatePath('/creators/[slug]', 'page')
  revalidatePath('/comics/[slug]', 'page')
  return { ok: true }
}

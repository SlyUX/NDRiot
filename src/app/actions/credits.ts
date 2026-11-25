'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { creatorsOwnedBy } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'
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

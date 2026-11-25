'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { isAdminEmail } from '@/lib/admin'
import { recordOwnership } from '@/sanity/ownership-client'

/**
 * Admin-only ownership reassignment (Phase: ownership transfer). Changes which
 * verified email owns a creator profile — and therefore every comic under it,
 * since comics inherit their creator's owner. This is the "unless an admin
 * changes that" lever; `recordOwnership` is create-or-replace, so it both claims
 * an unowned profile and moves an owned one.
 *
 * The new owner must sign in with THAT Google address to edit — reassigning
 * doesn't move any Google account, only which address the map trusts.
 */
type Result = { ok: true; email: string } | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function reassignOwnership(
  creatorId: string,
  newEmail: string,
): Promise<Result> {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) return { ok: false, error: 'Not authorized.' }

  const email = newEmail.trim().toLowerCase()
  if (!creatorId) return { ok: false, error: 'Missing creator.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email address.' }

  try {
    await recordOwnership(email, creatorId)
  } catch (cause) {
    console.error('[ownership] reassign failed', cause)
    return { ok: false, error: 'Something went wrong — please try again.' }
  }

  revalidatePath('/admin/ownership')
  return { ok: true, email }
}

'use server'

import { auth, signIn } from '@/auth'
import { toggleSave, type SavedItemType } from '@/sanity/reader-client'

/**
 * Toggle a reader's save on a comic or maker.
 *
 * Called from the client SaveButton. When the reader isn't signed in, it starts
 * Google sign-in and returns them to the page they were on (`returnTo`) — so a
 * tap on Save becomes "sign in, then you're saved-ready" without losing context.
 * Identity is always taken from the verified session, never the client.
 */
export type SaveResult = { saved: boolean; error?: boolean }

export async function toggleSaveAction(
  itemType: SavedItemType,
  itemId: string,
  returnTo: string,
): Promise<SaveResult> {
  const session = await auth()
  const email = session?.user?.email?.trim()

  if (!email) {
    // Redirects to Google, then back to `returnTo` — throws NEXT_REDIRECT, so
    // nothing below runs. Only same-origin paths are honored.
    const safe = returnTo.startsWith('/') ? returnTo : '/'
    await signIn('google', { redirectTo: safe })
    return { saved: false }
  }

  try {
    return { saved: await toggleSave(email, itemType, itemId) }
  } catch (cause) {
    console.error('[saves] toggle failed', cause)
    return { saved: false, error: true }
  }
}

'use server'

import { auth, signIn } from '@/auth'
import { toggleSave, unsaveItem, type SavedItemType } from '@/sanity/reader-client'

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

/** Remove a saved item from the dashboard. Identity from the session. */
export async function removeSaveAction(itemId: string): Promise<{ ok: boolean }> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false }
  try {
    await unsaveItem(email, itemId)
    return { ok: true }
  } catch (cause) {
    console.error('[saves] remove failed', cause)
    return { ok: false }
  }
}

/**
 * Start Google sign-in from the sign-in modal, returning to `returnTo`. Bound to
 * `returnTo` and used as a <form action>; the FormData React passes is ignored.
 * Redirects (throws NEXT_REDIRECT) on success.
 */
export async function startSignIn(returnTo: string): Promise<void> {
  const safe = returnTo.startsWith('/') ? returnTo : '/'
  await signIn('google', { redirectTo: safe })
}

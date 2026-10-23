'use server'

import { auth } from '@/auth'
import { setStripSubscription } from '@/sanity/reader-prefs-client'

/**
 * Toggle the signed-in reader's "notify me about new strips" subscription.
 * Called from the StripsSubscribe control on /comics?tab=strips. Identity is
 * always taken from the verified session, never the client.
 */
export async function setStripSubscriptionAction(
  enabled: boolean,
): Promise<{ ok: boolean; subscribed: boolean }> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false, subscribed: false }
  try {
    const subscribed = await setStripSubscription(email, enabled)
    return { ok: true, subscribed }
  } catch (cause) {
    console.error('[notifications] set strip subscription failed', cause)
    return { ok: false, subscribed: false }
  }
}

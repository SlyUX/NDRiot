'use server'

import { auth } from '@/auth'
import { dismissRagBanner, setStripSubscription } from '@/sanity/reader-prefs-client'

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

/**
 * Dismiss the home "submissions open" banner for the current period (the
 * oldest-open issue's id). Identity is taken from the verified session.
 */
export async function dismissRagBannerAction(periodId: string): Promise<{ ok: boolean }> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false }
  try {
    await dismissRagBanner(email, periodId)
    return { ok: true }
  } catch (cause) {
    console.error('[notifications] dismiss rag banner failed', cause)
    return { ok: false }
  }
}

'use server'

import { auth } from '@/auth'
import {
  dismissRagBanner,
  setEmailPref,
  setStripSubscription,
} from '@/sanity/reader-prefs-client'

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
 * Toggle an email notification preference (messages / collaboration requests).
 * Opt-out: on by default; this lets a creator turn the emails off. Identity from
 * the verified session.
 */
export async function setEmailPrefAction(
  key: 'emailMessages' | 'emailCollab',
  value: boolean,
): Promise<{ ok: boolean; value: boolean }> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false, value }
  try {
    const next = await setEmailPref(email, key, value)
    return { ok: true, value: next }
  } catch (cause) {
    console.error('[notifications] set email pref failed', cause)
    return { ok: false, value }
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

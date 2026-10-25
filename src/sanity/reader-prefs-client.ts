import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { emailHmac, normalizeEmail } from '@/lib/email-hash'

import { apiVersion, projectId } from './env'

/**
 * Per-reader notification preferences + the "last seen" marker.
 *
 * Same private-dataset + HMAC-key model as reader-client / account-client:
 * stored in `ndriot_auth`, keyed `readerPrefs.<emailHmac>`, never the public
 * dataset and never beside a plaintext email. Holds only a boolean and a
 * timestamp — no PII.
 *
 * It lives server-side (not localStorage) on purpose: the "new since" baseline
 * and the strips subscription are then device-independent, so a future
 * PWA/native-push layer reads the same source of truth and nothing here has to
 * be rebuilt (AGENTS.md app-feel direction).
 *
 * AGENTS.md §3: a notification is an explicit follow-benefit, never inference.
 * Nothing here ranks or aggregates anyone.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — reader-prefs client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

export interface ReaderPrefs {
  subscribeAllStrips: boolean
  /** ISO timestamp; `null` until a baseline is established. */
  notificationsSeenAt: string | null
  /**
   * The Rag submission "period" (the oldest-open issue's id) this reader has
   * dismissed the home banner for. When a new period begins the id changes and
   * the banner returns — no manual reset. `null` = never dismissed.
   */
  ragBannerDismissedPeriod: string | null
}

const EMPTY: ReaderPrefs = {
  subscribeAllStrips: false,
  notificationsSeenAt: null,
  ragBannerDismissedPeriod: null,
}

const prefsId = (email: string) => `readerPrefs.${emailHmac(email)}`

/** The seed written when a prefs doc is first created. */
function seed(email: string, notificationsSeenAt: string, subscribeAllStrips = false) {
  return {
    _id: prefsId(email),
    _type: 'readerPrefs' as const,
    emailHmac: emailHmac(email),
    subscribeAllStrips,
    notificationsSeenAt,
  }
}

/** This reader's prefs, or defaults if none exist yet. Pure read, fail-soft. */
export async function getReaderPrefs(email: string): Promise<ReaderPrefs> {
  const owner = normalizeEmail(email)
  if (!owner) return EMPTY
  try {
    const doc = await client().fetch<ReaderPrefs | null>(
      `*[_id==$id][0]{"subscribeAllStrips":coalesce(subscribeAllStrips,false),notificationsSeenAt,"ragBannerDismissedPeriod":coalesce(ragBannerDismissedPeriod,null)}`,
      { id: prefsId(owner) },
    )
    return doc ?? EMPTY
  } catch (cause) {
    console.error('[reader-prefs] get failed', cause)
    return EMPTY
  }
}

/**
 * Prefs with a guaranteed `notificationsSeenAt`. The first time we ever read for
 * a reader, "now" becomes their zero — so they never open to a wall of backlog.
 * One write per reader, ever (createIfNotExists no-ops once the doc exists).
 */
export async function ensureSeenBaseline(email: string): Promise<ReaderPrefs> {
  const owner = normalizeEmail(email)
  if (!owner) return EMPTY
  const current = await getReaderPrefs(owner)
  if (current.notificationsSeenAt) return current
  const now = new Date().toISOString()
  try {
    await client().createIfNotExists(seed(owner, now, current.subscribeAllStrips))
  } catch (cause) {
    console.error('[reader-prefs] baseline init failed', cause)
  }
  return {
    subscribeAllStrips: current.subscribeAllStrips,
    notificationsSeenAt: now,
    ragBannerDismissedPeriod: current.ragBannerDismissedPeriod,
  }
}

/** Set (or clear) the "notify me about new strips" subscription. Returns the new state. */
export async function setStripSubscription(email: string, enabled: boolean): Promise<boolean> {
  const owner = normalizeEmail(email)
  if (!owner) return false
  const now = new Date().toISOString()
  try {
    await client().createIfNotExists(seed(owner, now))
    await client().patch(prefsId(owner)).set({ subscribeAllStrips: enabled }).commit()
    return enabled
  } catch (cause) {
    console.error('[reader-prefs] setStripSubscription failed', cause)
    return false
  }
}

/** Remember that this reader dismissed the Rag banner for the given period. */
export async function dismissRagBanner(email: string, periodId: string): Promise<void> {
  const owner = normalizeEmail(email)
  if (!owner || !periodId) return
  const now = new Date().toISOString()
  try {
    await client().createIfNotExists(seed(owner, now))
    await client().patch(prefsId(owner)).set({ ragBannerDismissedPeriod: periodId }).commit()
  } catch (cause) {
    console.error('[reader-prefs] dismissRagBanner failed', cause)
  }
}

/** Mark notifications seen — resets the "new since" marker to now. */
export async function markNotificationsSeen(email: string): Promise<void> {
  const owner = normalizeEmail(email)
  if (!owner) return
  const now = new Date().toISOString()
  try {
    await client().createIfNotExists(seed(owner, now))
    await client().patch(prefsId(owner)).set({ notificationsSeenAt: now }).commit()
  } catch (cause) {
    console.error('[reader-prefs] markNotificationsSeen failed', cause)
  }
}

import 'server-only'

import { appearanceToFeedItem, mergeFeed } from '@/lib/feed-mappers'
import {
  safeFetch,
  APPEARANCE_FEED_QUERY,
  NOTIFICATION_COUNTS_QUERY,
  UPDATES_FEED_QUERY,
} from '@/lib/queries'
import type { AppearanceFeedRow, UpdateFeedItem } from '@/lib/types'
import { savedItems } from '@/sanity/reader-client'
import { ensureSeenBaseline } from '@/sanity/reader-prefs-client'

/**
 * The signed-in reader's notifications: updates and convention appearances from
 * the creators/comics they follow, plus — if they subscribed — new strips, all
 * since their last-seen marker.
 *
 * AGENTS.md §3: everything here is an explicit follow-benefit (you chose to
 * follow, or chose to subscribe to strips). Nothing is inferred, ranked, or
 * aggregated into a popularity signal, and there are no re-engagement nudges —
 * a notification only ever reflects new activity on something you opted into.
 */

const FEED_CAP = 30

function followIdsFrom(saves: { itemType: string; itemId: string }[]): string[] {
  return saves
    .filter((s) => s.itemType === 'book' || s.itemType === 'creator')
    .map((s) => s.itemId)
}

const newerThan = (since: string) => (ts: string | null | undefined) =>
  Boolean(ts) && new Date(ts as string).getTime() > new Date(since).getTime()

/** Unread count for the nav bell. Fail-soft to 0. */
export async function notificationCount(email: string): Promise<number> {
  if (!email) return 0
  const prefs = await ensureSeenBaseline(email)
  const since = prefs.notificationsSeenAt
  if (!since) return 0

  const followIds = followIdsFrom(await savedItems(email))
  if (followIds.length === 0 && !prefs.subscribeAllStrips) return 0

  const counts = await safeFetch<{ updates: number; appearances: number; strips: number }>(
    NOTIFICATION_COUNTS_QUERY,
    { ids: followIds, since },
    { updates: 0, appearances: 0, strips: 0 },
  )
  // Strips are a single aggregate signal (one "new strips" notification), and
  // only when the reader subscribed.
  const stripSignal = prefs.subscribeAllStrips && counts.strips > 0 ? 1 : 0
  return counts.updates + counts.appearances + stripSignal
}

export interface NewNotifications {
  /** Followed creators'/comics' updates + appearances, newest-first. */
  updates: UpdateFeedItem[]
  /** Whether new strips exist since last-seen (only ever true if subscribed). */
  newStrips: boolean
}

/** The items to show on the notifications page. Does NOT mark them seen. */
export async function newNotifications(
  email: string,
  conventionFeedBody: string,
): Promise<NewNotifications> {
  if (!email) return { updates: [], newStrips: false }
  const prefs = await ensureSeenBaseline(email)
  const since = prefs.notificationsSeenAt
  if (!since) return { updates: [], newStrips: false }

  const followIds = followIdsFrom(await savedItems(email))
  const [posts, appearances, counts] = await Promise.all([
    followIds.length
      ? safeFetch<UpdateFeedItem[]>(UPDATES_FEED_QUERY, { ids: followIds, limit: FEED_CAP }, [])
      : Promise.resolve<UpdateFeedItem[]>([]),
    followIds.length
      ? safeFetch<AppearanceFeedRow[]>(APPEARANCE_FEED_QUERY, { ids: followIds, limit: FEED_CAP }, [])
      : Promise.resolve<AppearanceFeedRow[]>([]),
    prefs.subscribeAllStrips
      ? safeFetch<{ updates: number; appearances: number; strips: number }>(
          NOTIFICATION_COUNTS_QUERY,
          { ids: followIds, since },
          { updates: 0, appearances: 0, strips: 0 },
        )
      : Promise.resolve({ updates: 0, appearances: 0, strips: 0 }),
  ])

  const isNew = newerThan(since)
  const updates = mergeFeed(
    posts.filter((p) => isNew(p.publishedAt)),
    appearances
      .filter((a) => isNew(a.publishedAt))
      .map((a) => appearanceToFeedItem(a, conventionFeedBody)),
    FEED_CAP,
  )
  return { updates, newStrips: prefs.subscribeAllStrips && counts.strips > 0 }
}

import type {
  AppearanceFeedRow,
  RailUpdate,
  UpdateFeedItem,
} from "@/lib/types";

/**
 * Convention appearances aren't `update` docs, but they belong in a follower's
 * feed. These map a raw appearance into the same shapes the feed already
 * renders — an "At a convention" item whose target is the creator and whose
 * body links out via a convention mention chip — so both the homepage rail and
 * the dashboard "Your Feed" show them with zero rendering changes.
 *
 * `bodyTemplate` is CMS copy with a `{venue}` placeholder (§2), e.g.
 * "Appearing at {venue}".
 */

function appearanceBody(row: AppearanceFeedRow, bodyTemplate: string): string {
  return bodyTemplate.replace("{venue}", row.venue.name);
}

/** The convention as a feed-item mention chip (name + link-out to its site). */
function venueMention(row: AppearanceFeedRow) {
  return [
    {
      _id: row.venue._id,
      _type: row.venue._type,
      name: row.venue.name,
      slug: row.venue.slug,
      website: row.venue.website,
    },
  ];
}

/** For the homepage hero rail (carries the creator's avatar). */
export function appearanceToRailItem(
  row: AppearanceFeedRow,
  bodyTemplate: string,
): RailUpdate {
  return {
    _id: row._id,
    body: appearanceBody(row, bodyTemplate),
    kind: "At a convention",
    publishedAt: row.publishedAt,
    targetType: "creator",
    targetName: row.creatorName,
    targetSlug: row.creatorSlug,
    authorName: row.creatorName,
    photo: row.creatorPhoto,
    mentions: venueMention(row),
  };
}

/** For the dashboard "Your Feed" (read-only update list). */
export function appearanceToFeedItem(
  row: AppearanceFeedRow,
  bodyTemplate: string,
): UpdateFeedItem {
  return {
    _id: row._id,
    body: appearanceBody(row, bodyTemplate),
    kind: "At a convention",
    publishedAt: row.publishedAt,
    targetId: row.creatorId,
    targetType: "creator",
    targetName: row.creatorName,
    targetSlug: row.creatorSlug,
    mentions: venueMention(row),
  };
}

/** Merge appearance items into an update feed, newest first, capped. Recency
 *  only — never ranked or counted (§3). */
export function mergeFeed<T extends { publishedAt: string }>(
  updates: T[],
  appearances: T[],
  cap: number,
): T[] {
  return [...updates, ...appearances]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, cap);
}

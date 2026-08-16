import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

/**
 * A non-CDN client for reads that must reflect a just-made write immediately —
 * creator-authored, mutable content (ratings, appearances) on already-dynamic
 * pages. The CDN caches for a few seconds after a change, which is fine for
 * editorial content but leaves a creator staring at a stale page right after
 * they rate or mark attendance. Use sparingly; the CDN client is the default.
 */
export const liveClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

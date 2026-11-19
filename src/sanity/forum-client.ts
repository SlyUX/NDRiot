import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import type { ForumBoard, ForumPost, ForumReport, ForumThread } from '../../sanity.types'

import { uploadImageFile, type UploadResult } from '@/lib/intake/uploads'

import { apiVersion, projectId } from './env'

/**
 * The community forum — boards, threads, and posts. Roster-gated, so the WHOLE
 * forum (board list included) lives in the private `ndriot_auth` dataset, never
 * the world-readable `production` dataset. Same token/client model as
 * message-client / rag-submission-client.
 *
 * Shape notes:
 *  - `forumBoard` → `forumThread` → `forumPost` are all in THIS dataset, so
 *    thread→board and post→thread are real references. The AUTHOR is a
 *    `production` creator, which an `ndriot_auth` doc can't reference, so authors
 *    are denormalized as id + name strings (same rule as messageThread).
 *  - Posts are SEPARATE documents (threads grow long), unlike inline messages.
 *  - Edit history: an edit pushes the current `{body,image,savedAt}` into
 *    `revisions[]` before overwriting; a delete flips `status` to 'deleted' and
 *    keeps the content on the doc (the reader projection renders a tombstone and
 *    never ships a deleted body to the client). Nothing is destroyed.
 *  - §3: thread lists sort pinned-first then `lastPostAt` desc — a recency
 *    signal only. There is no count field to rank by.
 *
 * Everything fails soft. Identity/ownership is verified by the caller
 * (src/app/actions/forum.ts).
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — forum client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

/** A short, _id-safe unique suffix. */
function uid(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(
    /[^a-zA-Z0-9]/g,
    '',
  )
}

/* ------------------------------------------------------------ images */

/**
 * Upload an attached post image into the PRIVATE `ndriot_auth` dataset (assets
 * are per-dataset). Already downscaled to 1080×1350 client-side; this validates
 * type/size server-side and returns the bare asset id. Non-fatal by contract.
 */
export async function uploadForumImage(file: File, filename: string): Promise<UploadResult> {
  return uploadImageFile(file, filename, client())
}

/* ------------------------------------------------------------ reads */

/** Every board, in editorial order. */
export async function listCategories(): Promise<ForumBoard[]> {
  try {
    return (
      (await client().fetch<ForumBoard[]>(
        `*[_type=="forumBoard"] | order(order asc)`,
      )) ?? []
    )
  } catch (cause) {
    console.error('[forum] listCategories failed', cause)
    return []
  }
}

/** One board by its document id, or null — for server-side posting checks. */
export async function getCategoryById(id: string): Promise<ForumBoard | null> {
  if (!id) return null
  try {
    return await client().fetch<ForumBoard | null>(`*[_id==$id][0]`, { id })
  } catch (cause) {
    console.error('[forum] getCategoryById failed', cause)
    return null
  }
}

/** One board by its slug, or null. */
export async function getCategoryBySlug(slug: string): Promise<ForumBoard | null> {
  if (!slug) return null
  try {
    return await client().fetch<ForumBoard | null>(
      `*[_type=="forumBoard" && slug.current==$slug][0]`,
      { slug },
    )
  } catch (cause) {
    console.error('[forum] getCategoryBySlug failed', cause)
    return null
  }
}

/** Threads in a board, pinned first then most-recent activity. Removed threads
 *  are excluded (they are hidden from readers). */
export async function threadsInCategory(categoryId: string): Promise<ForumThread[]> {
  if (!categoryId) return []
  try {
    return (
      (await client().fetch<ForumThread[]>(
        `*[_type=="forumThread" && category._ref==$cat && status != "removed"]
          | order(pinned desc, coalesce(lastPostAt, createdAt) desc)`,
        { cat: categoryId },
      )) ?? []
    )
  } catch (cause) {
    console.error('[forum] threadsInCategory failed', cause)
    return []
  }
}

/** A thread by its document id, or null. */
export async function getThreadById(docId: string): Promise<ForumThread | null> {
  if (!docId) return null
  try {
    return await client().fetch<ForumThread | null>(`*[_id==$id][0]`, { id: docId })
  } catch (cause) {
    console.error('[forum] getThreadById failed', cause)
    return null
  }
}

/** All posts in a thread, oldest first. Deleted posts are KEPT in place (the
 *  caller renders them as tombstones); callers never ship a deleted body. */
export async function postsInThread(threadId: string): Promise<ForumPost[]> {
  if (!threadId) return []
  try {
    return (
      (await client().fetch<ForumPost[]>(
        `*[_type=="forumPost" && thread._ref==$tid] | order(createdAt asc)`,
        { tid: threadId },
      )) ?? []
    )
  } catch (cause) {
    console.error('[forum] postsInThread failed', cause)
    return []
  }
}

/** A post by id — for edit/delete/report membership checks. */
export async function getPostById(docId: string): Promise<ForumPost | null> {
  if (!docId) return null
  try {
    return await client().fetch<ForumPost | null>(`*[_id==$id][0]`, { id: docId })
  } catch (cause) {
    console.error('[forum] getPostById failed', cause)
    return null
  }
}

/** The most recent thread in each board, for the board-list "latest" line.
 *  Map categoryId → { title, lastPostAt }. */
export async function latestThreadByCategory(): Promise<
  Map<string, { title: string; lastPostAt: string | null }>
> {
  try {
    const rows =
      (await client().fetch<
        { cat: string | null; title: string | null; lastPostAt: string | null }[]
      >(
        `*[_type=="forumThread" && status=="open"] | order(coalesce(lastPostAt, createdAt) desc)
          { "cat": category._ref, title, "lastPostAt": coalesce(lastPostAt, createdAt) }`,
      )) ?? []
    const map = new Map<string, { title: string; lastPostAt: string | null }>()
    for (const r of rows) {
      if (r.cat && !map.has(r.cat)) map.set(r.cat, { title: r.title ?? '', lastPostAt: r.lastPostAt })
    }
    return map
  } catch (cause) {
    console.error('[forum] latestThreadByCategory failed', cause)
    return new Map()
  }
}

/* ------------------------------------------------------------ writes */

export type CreateThreadResult = { threadId: string } | { error: string }

/**
 * Open a new thread: a `forumThread` plus its opening `forumPost` (isOpener).
 * Ids are pre-generated so the opener can reference the thread in one pass.
 */
export async function createThread(input: {
  categoryId: string
  authorId: string
  authorName: string
  title: string
  body: string
  imageAssetId?: string | null
  createdAt: string
}): Promise<CreateThreadResult> {
  if (!input.categoryId || !input.authorId) return { error: 'error' }
  const threadId = `forumthread.${uid()}`
  const postId = `forumpost.${uid()}`
  try {
    await client().transaction()
      .create({
        _id: threadId,
        _type: 'forumThread',
        title: input.title,
        category: { _type: 'reference', _ref: input.categoryId },
        authorId: input.authorId,
        authorName: input.authorName,
        status: 'open',
        pinned: false,
        createdAt: input.createdAt,
        lastPostAt: input.createdAt,
      })
      .create({
        _id: postId,
        _type: 'forumPost',
        thread: { _type: 'reference', _ref: threadId },
        authorId: input.authorId,
        authorName: input.authorName,
        body: input.body,
        isOpener: true,
        status: 'visible',
        createdAt: input.createdAt,
        ...(input.imageAssetId
          ? {
              image: {
                _type: 'image' as const,
                asset: { _type: 'reference' as const, _ref: input.imageAssetId },
              },
            }
          : {}),
      })
      .commit()
    return { threadId }
  } catch (cause) {
    console.error('[forum] createThread failed', cause)
    return { error: 'error' }
  }
}

export type PostResult = 'posted' | 'locked' | 'error'

/** Append a reply and advance the thread's `lastPostAt`. Thread must be open. */
export async function createPost(input: {
  threadId: string
  authorId: string
  authorName: string
  body: string
  imageAssetId?: string | null
  createdAt: string
}): Promise<PostResult> {
  try {
    const thread = await client().fetch<{ status: string | null } | null>(
      `*[_id==$id][0]{status}`,
      { id: input.threadId },
    )
    if (!thread) return 'error'
    if (thread.status !== 'open') return 'locked'
    await client().transaction()
      .create({
        _id: `forumpost.${uid()}`,
        _type: 'forumPost',
        thread: { _type: 'reference', _ref: input.threadId },
        authorId: input.authorId,
        authorName: input.authorName,
        body: input.body,
        isOpener: false,
        status: 'visible',
        createdAt: input.createdAt,
        ...(input.imageAssetId
          ? {
              image: {
                _type: 'image' as const,
                asset: { _type: 'reference' as const, _ref: input.imageAssetId },
              },
            }
          : {}),
      })
      .patch(input.threadId, (p) => p.set({ lastPostAt: input.createdAt }))
      .commit()
    return 'posted'
  } catch (cause) {
    console.error('[forum] createPost failed', cause)
    return 'error'
  }
}

export type AuthorEditResult = 'ok' | 'not-author' | 'error'

/**
 * Edit a post. Pushes the CURRENT `{body,image,savedAt}` into `revisions[]`
 * before overwriting, so the full history survives. Author-gated here too
 * (defense in depth; the action already resolved identity).
 */
export async function editPost(input: {
  postId: string
  authorId: string
  body: string
  imageAssetId?: string | null
  /** When true, clears the image even if one exists. Ignored if imageAssetId is set. */
  removeImage?: boolean
  editedAt: string
}): Promise<AuthorEditResult> {
  try {
    const post = await client().fetch<ForumPost | null>(`*[_id==$id][0]`, { id: input.postId })
    if (!post) return 'error'
    if (post.authorId !== input.authorId) return 'not-author'

    const revision = {
      _type: 'revision' as const,
      _key: `rev-${input.editedAt}`.replace(/[^a-zA-Z0-9._-]/g, '-'),
      body: post.body,
      ...(post.image ? { image: post.image } : {}),
      savedAt: post.editedAt ?? post.createdAt ?? input.editedAt,
    }

    const nextImage = input.imageAssetId
      ? {
          image: {
            _type: 'image' as const,
            asset: { _type: 'reference' as const, _ref: input.imageAssetId },
          },
        }
      : {}

    let patch = client()
      .patch(input.postId)
      .setIfMissing({ revisions: [] })
      .append('revisions', [revision])
      .set({ body: input.body, editedAt: input.editedAt, ...nextImage })

    if (!input.imageAssetId && input.removeImage) {
      patch = patch.unset(['image'])
    }

    await patch.commit()
    return 'ok'
  } catch (cause) {
    console.error('[forum] editPost failed', cause)
    return 'error'
  }
}

/**
 * Delete a post (by its author). Flips `status` to 'deleted'; the body/image and
 * revision history stay on the doc for moderation, and the reader UI renders a
 * tombstone. If the deleted post is a thread opener, the thread stays (title +
 * replies survive).
 */
export async function deletePost(input: {
  postId: string
  authorId: string
  deletedAt: string
}): Promise<AuthorEditResult> {
  try {
    const post = await client().fetch<{ authorId: string | null } | null>(
      `*[_id==$id][0]{authorId}`,
      { id: input.postId },
    )
    if (!post) return 'error'
    if (post.authorId !== input.authorId) return 'not-author'
    await client().patch(input.postId).set({ status: 'deleted', editedAt: input.deletedAt }).commit()
    return 'ok'
  } catch (cause) {
    console.error('[forum] deletePost failed', cause)
    return 'error'
  }
}

/* ------------------------------------------------------------ reports */

/** File a report for Operations review. Snapshots the flagged post body. */
export async function createForumReport(input: {
  reporterId: string
  reporterName: string
  threadId: string
  postId: string
  reportedText: string
  reason: string
  reporterNote: string
  createdAt: string
}): Promise<boolean> {
  try {
    await client().create({
      _type: 'forumReport',
      status: 'open',
      reason: input.reason,
      reportedText: input.reportedText,
      reporterNote: input.reporterNote,
      reporterId: input.reporterId,
      reporterName: input.reporterName,
      threadId: input.threadId,
      postId: input.postId,
      createdAt: input.createdAt,
    })
    return true
  } catch (cause) {
    console.error('[forum] createForumReport failed', cause)
    return false
  }
}

/** A report doc by id — for the resolve-report route. */
export async function getForumReportById(docId: string): Promise<ForumReport | null> {
  if (!docId) return null
  try {
    return await client().fetch<ForumReport | null>(`*[_id==$id][0]`, { id: docId })
  } catch (cause) {
    console.error('[forum] getForumReportById failed', cause)
    return null
  }
}

/* ------------------------------------------------------------ read state */

/**
 * Per-(creator, thread) read markers — schema-less bookkeeping docs, like the
 * messaging ones. A thread is "unread" for a creator when its `lastPostAt` is
 * newer than their marker (or they've never opened it). Posting or opening a
 * thread advances the marker, so a creator's own last post never reads as unread.
 */
function readId(creatorId: string, threadId: string): string {
  return `forumread.${creatorId}__${threadId}`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

/** Advance this creator's read marker on a thread to now. Idempotent. */
export async function markThreadRead(creatorId: string, threadId: string): Promise<boolean> {
  if (!creatorId || !threadId) return false
  try {
    await client().createOrReplace({
      _id: readId(creatorId, threadId),
      _type: 'forumRead',
      creatorId,
      threadId,
      lastReadAt: new Date().toISOString(),
    })
    return true
  } catch (cause) {
    console.error('[forum] markThreadRead failed', cause)
    return false
  }
}

/** This creator's read markers as a map threadId → lastReadAt (ISO). */
export async function readStamps(creatorId: string): Promise<Map<string, string>> {
  if (!creatorId) return new Map()
  try {
    const rows =
      (await client().fetch<{ threadId: string | null; lastReadAt: string | null }[]>(
        `*[_type=="forumRead" && creatorId==$id]{threadId, lastReadAt}`,
        { id: creatorId },
      )) ?? []
    return new Map(
      rows
        .filter((r): r is { threadId: string; lastReadAt: string } =>
          Boolean(r.threadId && r.lastReadAt),
        )
        .map((r) => [r.threadId, r.lastReadAt]),
    )
  } catch (cause) {
    console.error('[forum] readStamps failed', cause)
    return new Map()
  }
}

/** Unread open threads per board: Map categoryId → count. A thread counts when
 *  its last activity is newer than this creator's marker (never-opened = unread). */
export async function unreadByCategory(creatorId: string): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!creatorId) return out
  try {
    const [threads, stamps] = await Promise.all([
      client().fetch<{ _id: string; cat: string | null; lastPostAt: string | null }[]>(
        `*[_type=="forumThread" && status=="open"]{_id, "cat": category._ref, "lastPostAt": coalesce(lastPostAt, createdAt)}`,
      ),
      readStamps(creatorId),
    ])
    for (const t of threads ?? []) {
      if (!t.cat || !t.lastPostAt) continue
      if (t.lastPostAt > (stamps.get(t._id) ?? '')) {
        out.set(t.cat, (out.get(t.cat) ?? 0) + 1)
      }
    }
    return out
  } catch (cause) {
    console.error('[forum] unreadByCategory failed', cause)
    return out
  }
}

/** Total unread open threads across all boards — the nav badge. */
export async function totalUnread(creatorId: string): Promise<number> {
  const byCat = await unreadByCategory(creatorId)
  let total = 0
  for (const n of byCat.values()) total += n
  return total
}

/* ------------------------------------------------------------ moderation */

/** Lock a thread (no new replies). */
export async function lockThread(threadId: string, locked: boolean): Promise<boolean> {
  try {
    await client()
      .patch(threadId)
      .set({ status: locked ? 'locked' : 'open', reviewedAt: new Date().toISOString() })
      .commit()
    return true
  } catch (cause) {
    console.error('[forum] lockThread failed', cause)
    return false
  }
}

/** Remove a thread (hidden from readers). */
export async function removeThread(threadId: string): Promise<boolean> {
  try {
    await client()
      .patch(threadId)
      .set({ status: 'removed', reviewedAt: new Date().toISOString() })
      .commit()
    return true
  } catch (cause) {
    console.error('[forum] removeThread failed', cause)
    return false
  }
}

/** Pin or unpin a thread (admin housekeeping). */
export async function pinThread(threadId: string, pinned: boolean): Promise<boolean> {
  try {
    await client().patch(threadId).set({ pinned }).commit()
    return true
  } catch (cause) {
    console.error('[forum] pinThread failed', cause)
    return false
  }
}

/** Hide a post (moderator). Content kept for the record; reader sees a tombstone. */
export async function hidePost(postId: string): Promise<boolean> {
  try {
    await client()
      .patch(postId)
      .set({ status: 'deleted', editedAt: new Date().toISOString() })
      .commit()
    return true
  } catch (cause) {
    console.error('[forum] hidePost failed', cause)
    return false
  }
}

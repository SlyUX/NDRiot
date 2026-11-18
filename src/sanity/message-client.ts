import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import type { MessageReport, MessageThread } from '../../sanity.types'

import { apiVersion, projectId } from './env'

/**
 * Creator-to-creator message threads — the persistent channel behind the
 * "Message" handshake (parallel to the collab handshake in collab-client.ts).
 *
 * Same private-dataset + token model as collab/reader/ownership: stored in
 * `ndriot_auth`, never the world-readable `production` dataset, because threads
 * carry free-text message bodies tied to two creators (PII). Schema-backed
 * (messageThread) so the Operations Studio workspace can moderate; types here
 * are the generated ones, not hand-written (AGENTS §7).
 *
 * The `_id` is deterministic from the creator pair SORTED, so one thread exists
 * per pair regardless of who initiates — and `create` (not createOrReplace) is
 * the gate: a second request, a re-request after a decline, or a request to
 * someone who has blocked you all resolve to the same id and are refused. A
 * block/close is therefore terminal by construction.
 *
 * Everything fails soft: a write error returns an error token, never throws.
 * Identity/ownership is verified by the caller (src/app/actions/messages.ts).
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — message client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

type MessageItem = NonNullable<MessageThread['messages']>[number]

/** Deterministic, _id-safe id for the unordered pair {a, b}. */
function threadId(a: string, b: string): string {
  const [x, y] = [a, b].sort()
  return `thread.${x}__${y}`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

/** Separate id lane for a collaboration chat, so a pair can have both a general
 *  message thread AND a dedicated collab chat without colliding. */
function collabThreadId(a: string, b: string): string {
  const [x, y] = [a, b].sort()
  return `thread.collab.${x}__${y}`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

/** The thread for this pair, or null. Drives the profile button + thread view. */
export async function getThread(a: string, b: string): Promise<MessageThread | null> {
  if (!a || !b) return null
  try {
    return await client().fetch<MessageThread | null>(`*[_id==$id][0]`, { id: threadId(a, b) })
  } catch (cause) {
    console.error('[message] getThread failed', cause)
    return null
  }
}

/** A thread by its document id — for opt-out / block / report membership checks. */
export async function getThreadById(docId: string): Promise<MessageThread | null> {
  if (!docId) return null
  try {
    return await client().fetch<MessageThread | null>(`*[_id==$id][0]`, { id: docId })
  } catch (cause) {
    console.error('[message] getThreadById failed', cause)
    return null
  }
}

/** Every thread this creator is a participant in, most recent activity first. */
export async function threadsFor(creatorId: string): Promise<MessageThread[]> {
  if (!creatorId) return []
  try {
    return (
      (await client().fetch<MessageThread[]>(
        `*[_type=="messageThread" && $id in participantIds] | order(coalesce(lastMessageAt, createdAt) desc)`,
        { id: creatorId },
      )) ?? []
    )
  } catch (cause) {
    console.error('[message] threadsFor failed', cause)
    return []
  }
}

/** Count of incoming requests awaiting this creator (pending, not self-sent) —
 *  for the nav badge. Fail-soft to 0. */
export async function pendingRequestCount(creatorId: string): Promise<number> {
  if (!creatorId) return 0
  try {
    return (
      (await client().fetch<number>(
        `count(*[_type=="messageThread" && $id in participantIds && status=="pending" && initiatedById != $id])`,
        { id: creatorId },
      )) ?? 0
    )
  } catch (cause) {
    console.error('[message] pendingRequestCount failed', cause)
    return 0
  }
}

/**
 * Open a new request. `create` is the one-thread-per-pair gate: a duplicate id
 * (a prior thread, a decline, or a block) surfaces as a conflict → `exists`.
 */
export async function createThreadRequest(input: {
  fromId: string
  fromName: string
  toId: string
  toName: string
  introNote: string
  createdAt: string
}): Promise<'created' | 'exists' | 'error'> {
  const { fromId, toId } = input
  if (!fromId || !toId || fromId === toId) return 'error'
  // Participant arrays stay aligned: names indexed to the SORTED ids.
  const nameOf: Record<string, string> = { [fromId]: input.fromName, [toId]: input.toName }
  const participantIds = [fromId, toId].sort()
  const participantNames = participantIds.map((id) => nameOf[id] ?? '')
  try {
    await client().create({
      _id: threadId(fromId, toId),
      _type: 'messageThread',
      status: 'pending',
      participantIds,
      participantNames,
      initiatedById: fromId,
      introNote: input.introNote,
      messages: [],
      createdAt: input.createdAt,
    })
    return 'created'
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/already exists|conflict|409/i.test(message)) return 'exists'
    console.error('[message] createThreadRequest failed', cause)
    return 'error'
  }
}

/**
 * Open the dedicated collaboration chat when a collab request is accepted. An
 * active, collab-origin thread in its own id lane, seeded empty (the genre shows
 * as the chat's context). `create` makes it idempotent — a second accept no-ops.
 */
export async function createCollabThread(input: {
  aId: string
  aName: string
  bId: string
  bName: string
  genre: string
  createdAt: string
}): Promise<'created' | 'exists' | 'error'> {
  const { aId, bId } = input
  if (!aId || !bId || aId === bId) return 'error'
  const nameOf: Record<string, string> = { [aId]: input.aName, [bId]: input.bName }
  const participantIds = [aId, bId].sort()
  const participantNames = participantIds.map((id) => nameOf[id] ?? '')
  try {
    await client().create({
      _id: collabThreadId(aId, bId),
      _type: 'messageThread',
      status: 'active',
      origin: 'collab',
      collabGenre: input.genre,
      participantIds,
      participantNames,
      initiatedById: aId,
      messages: [],
      createdAt: input.createdAt,
      respondedAt: input.createdAt,
      lastMessageAt: input.createdAt,
    })
    return 'created'
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/already exists|conflict|409/i.test(message)) return 'exists'
    console.error('[message] createCollabThread failed', cause)
    return 'error'
  }
}

export type RespondResult =
  | { result: 'missing' }
  | { result: 'terminal' }
  | { result: 'ok'; thread: MessageThread }

/**
 * Accept or decline a pending request. Accept → `active`, and the intro note is
 * seeded as the first message so `messages[]` is the single source for the
 * conversation. Decline → `declined` (terminal). Only a `pending` thread moves.
 */
export async function respondToThread(input: {
  threadDocId: string
  accept: boolean
  respondedAt: string
}): Promise<RespondResult> {
  try {
    const thread = await client().fetch<MessageThread | null>(`*[_id==$id][0]`, {
      id: input.threadDocId,
    })
    if (!thread) return { result: 'missing' }
    if (thread.status !== 'pending') return { result: 'terminal' }

    if (!input.accept) {
      const updated = await client()
        .patch(input.threadDocId)
        .set({ status: 'declined', respondedAt: input.respondedAt })
        .commit<MessageThread>()
      return { result: 'ok', thread: updated }
    }

    // Seed the intro as message #0 (from the initiator), then activate.
    const initiator = thread.initiatedById ?? ''
    const names = thread.participantNames ?? []
    const ids = thread.participantIds ?? []
    const initiatorName = ids[0] === initiator ? (names[0] ?? '') : (names[1] ?? '')
    const seed: MessageItem[] = thread.introNote
      ? [
          {
            _type: 'messageItem',
            _key: `m-${input.respondedAt}`,
            fromId: initiator,
            fromName: initiatorName,
            body: thread.introNote,
            createdAt: thread.createdAt ?? input.respondedAt,
          },
        ]
      : []
    const updated = await client()
      .patch(input.threadDocId)
      .set({
        status: 'active',
        respondedAt: input.respondedAt,
        messages: seed,
        lastMessageAt: input.respondedAt,
      })
      .commit<MessageThread>()
    return { result: 'ok', thread: updated }
  } catch (cause) {
    console.error('[message] respondToThread failed', cause)
    return { result: 'missing' }
  }
}

export type SendResult = 'sent' | 'not-active' | 'not-participant' | 'error'

/** Append a message. Guards: thread active and the sender is a participant. */
export async function appendMessage(input: {
  threadDocId: string
  fromId: string
  fromName: string
  body: string
  createdAt: string
}): Promise<SendResult> {
  try {
    const thread = await client().fetch<MessageThread | null>(
      `*[_id==$id][0]{status, participantIds}`,
      { id: input.threadDocId },
    )
    if (!thread) return 'error'
    if (!(thread.participantIds ?? []).includes(input.fromId)) return 'not-participant'
    if (thread.status !== 'active') return 'not-active'

    const message: MessageItem = {
      _type: 'messageItem',
      _key: `m-${input.createdAt}-${input.fromId}`.replace(/[^a-zA-Z0-9._-]/g, '-'),
      fromId: input.fromId,
      fromName: input.fromName,
      body: input.body,
      createdAt: input.createdAt,
    }
    await client()
      .patch(input.threadDocId)
      .setIfMissing({ messages: [] })
      .append('messages', [message])
      .set({ lastMessageAt: input.createdAt })
      .commit()
    return 'sent'
  } catch (cause) {
    console.error('[message] appendMessage failed', cause)
    return 'error'
  }
}

/** Opt out — the thread closes for both. Terminal; the pair's id can't reopen. */
export async function closeThread(threadDocId: string, closedById: string): Promise<boolean> {
  try {
    await client().patch(threadDocId).set({ status: 'closed', closedById }).commit()
    return true
  } catch (cause) {
    console.error('[message] closeThread failed', cause)
    return false
  }
}

/** Block — like close, but records who blocked; also prevents any new request. */
export async function blockThread(threadDocId: string, blockedById: string): Promise<boolean> {
  try {
    await client().patch(threadDocId).set({ status: 'blocked', blockedById }).commit()
    return true
  } catch (cause) {
    console.error('[message] blockThread failed', cause)
    return false
  }
}

/** File a report for Operations review. Snapshots the flagged text. */
export async function createReport(input: {
  reporterId: string
  reporterName: string
  threadId: string
  messageKey: string
  reportedText: string
  reason: string
  reporterNote: string
  createdAt: string
}): Promise<boolean> {
  try {
    await client().create({
      _type: 'messageReport',
      status: 'open',
      reason: input.reason,
      reportedText: input.reportedText,
      reporterNote: input.reporterNote,
      reporterId: input.reporterId,
      reporterName: input.reporterName,
      threadId: input.threadId,
      messageKey: input.messageKey,
      createdAt: input.createdAt,
    })
    return true
  } catch (cause) {
    console.error('[message] createReport failed', cause)
    return false
  }
}

/* ------------------------------------------------------------ read state */

/**
 * Per-(creator, thread) read markers — tiny bookkeeping docs, schema-less like
 * reader saves (no moderation surface needed). A thread is "unread" for a
 * creator when its lastMessageAt is newer than their marker. Sending or opening
 * a thread advances the marker, so a creator's own last message never reads as
 * unread. ISO timestamps compare lexicographically (all UTC, one format).
 */
function readId(creatorId: string, threadDocId: string): string {
  return `msgread.${creatorId}__${threadDocId}`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

/** Advance this creator's read marker on a thread to now. Idempotent. */
export async function markThreadRead(creatorId: string, threadDocId: string): Promise<boolean> {
  if (!creatorId || !threadDocId) return false
  try {
    await client().createOrReplace({
      _id: readId(creatorId, threadDocId),
      _type: 'messageRead',
      creatorId,
      threadId: threadDocId,
      lastReadAt: new Date().toISOString(),
    })
    return true
  } catch (cause) {
    console.error('[message] markThreadRead failed', cause)
    return false
  }
}

/** This creator's read markers as a map threadId → lastReadAt (ISO). */
export async function readStamps(creatorId: string): Promise<Map<string, string>> {
  if (!creatorId) return new Map()
  try {
    const rows =
      (await client().fetch<{ threadId: string | null; lastReadAt: string | null }[]>(
        `*[_type=="messageRead" && creatorId==$id]{threadId, lastReadAt}`,
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
    console.error('[message] readStamps failed', cause)
    return new Map()
  }
}

/** Count of active threads with activity newer than this creator last read —
 *  the unread half of the nav badge. */
export async function unreadThreadCount(creatorId: string): Promise<number> {
  if (!creatorId) return 0
  try {
    const [stamps, reads, muted] = await Promise.all([
      client().fetch<{ _id: string; lastMessageAt: string | null }[]>(
        `*[_type=="messageThread" && $id in participantIds && status=="active"]{_id, lastMessageAt}`,
        { id: creatorId },
      ),
      readStamps(creatorId),
      mutedThreadIds(creatorId),
    ])
    return (stamps ?? []).filter(
      (t) =>
        t.lastMessageAt &&
        !muted.has(t._id) &&
        t.lastMessageAt > (reads.get(t._id) ?? ''),
    ).length
  } catch (cause) {
    console.error('[message] unreadThreadCount failed', cause)
    return 0
  }
}

/* --------------------------------------------------------- moderation */

/** Record an admin-initiated review on a thread (both participants are notified
 *  by the route that calls this). */
export async function setReviewed(threadDocId: string): Promise<boolean> {
  if (!threadDocId) return false
  try {
    await client().patch(threadDocId).set({ reviewedAt: new Date().toISOString() }).commit()
    return true
  } catch (cause) {
    console.error('[message] setReviewed failed', cause)
    return false
  }
}

/** A report doc by id — for the resolve-report route. */
export async function getReportById(docId: string): Promise<MessageReport | null> {
  if (!docId) return null
  try {
    return await client().fetch<MessageReport | null>(`*[_id==$id][0]`, { id: docId })
  } catch (cause) {
    console.error('[message] getReportById failed', cause)
    return null
  }
}

/* ------------------------------------------------------------ mute */

/**
 * Per-(creator, thread) mute markers — schema-less, like read markers. A muted
 * thread stays active and readable; it just drops out of the unread nav badge.
 * Presence of the doc = muted.
 */
function muteId(creatorId: string, threadDocId: string): string {
  return `msgmute.${creatorId}__${threadDocId}`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

/** Mute or unmute a thread for this creator. */
export async function setMuted(
  creatorId: string,
  threadDocId: string,
  muted: boolean,
): Promise<boolean> {
  if (!creatorId || !threadDocId) return false
  try {
    if (muted) {
      await client().createOrReplace({
        _id: muteId(creatorId, threadDocId),
        _type: 'messageMute',
        creatorId,
        threadId: threadDocId,
      })
    } else {
      await client().delete(muteId(creatorId, threadDocId))
    }
    return true
  } catch (cause) {
    console.error('[message] setMuted failed', cause)
    return false
  }
}

/** The thread ids this creator has muted. */
export async function mutedThreadIds(creatorId: string): Promise<Set<string>> {
  if (!creatorId) return new Set()
  try {
    const ids =
      (await client().fetch<string[]>(
        `*[_type=="messageMute" && creatorId==$id].threadId`,
        { id: creatorId },
      )) ?? []
    return new Set(ids.filter(Boolean))
  } catch (cause) {
    console.error('[message] mutedThreadIds failed', cause)
    return new Set()
  }
}

export { threadId }

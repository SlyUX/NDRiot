import 'server-only'

import { createHash } from 'node:crypto'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * Notification bookkeeping, in the private `ndriot_auth` dataset (same store as
 * ownership/reader saves — never public production).
 *
 * Two jobs: (1) once-only markers so a webhook that fires on every publish/edit
 * only emails a given creator/book once; (2) a queue of newly-published books,
 * written by the webhook and drained by the midnight cron into per-creator
 * digests. All fail-soft.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — notify store cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

/** A stable, _id-safe hash so any doc id / kind maps to a valid document id. */
const hash = (input: string) => createHash('sha256').update(input).digest('hex').slice(0, 48)

const markerId = (kind: string, docId: string) => `notified.${hash(`${kind}:${docId}`)}`

/**
 * Whether this (kind, docId) was already notified. Fail-CLOSED (returns true on
 * error) so a store hiccup suppresses a possible duplicate rather than risking
 * a repeat email on every webhook fire.
 */
export async function wasNotified(kind: string, docId: string): Promise<boolean> {
  try {
    const found = await client().fetch<string | null>(`*[_id==$id][0]._id`, {
      id: markerId(kind, docId),
    })
    return Boolean(found)
  } catch (cause) {
    console.error('[notify] wasNotified failed', cause)
    return true
  }
}

/** Record that (kind, docId) has been notified, so it never fires again. */
export async function markNotified(kind: string, docId: string): Promise<void> {
  try {
    await client().createIfNotExists({ _id: markerId(kind, docId), _type: 'notified', kind, docId })
  } catch (cause) {
    console.error('[notify] markNotified failed', cause)
  }
}

export interface PendingBook {
  bookId: string
  creatorId: string
  title: string
}

/** Queue a newly-published book for the next daily digest (idempotent). */
export async function enqueueBook(book: PendingBook): Promise<void> {
  try {
    await client().createIfNotExists({
      _id: `pendingbook.${hash(book.bookId)}`,
      _type: 'pendingBookNotify',
      ...book,
    })
  } catch (cause) {
    console.error('[notify] enqueueBook failed', cause)
  }
}

/** Everything currently queued, for the cron to group and send. */
export async function pendingBooks(): Promise<(PendingBook & { _id: string })[]> {
  try {
    return (
      (await client().fetch<(PendingBook & { _id: string })[]>(
        `*[_type=="pendingBookNotify"]{_id, bookId, creatorId, title}`,
      )) ?? []
    )
  } catch (cause) {
    console.error('[notify] pendingBooks failed', cause)
    return []
  }
}

/** Remove drained queue entries (after their digest has been sent). */
export async function deletePending(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    let tx = client().transaction()
    for (const id of ids) tx = tx.delete(id)
    await tx.commit()
  } catch (cause) {
    console.error('[notify] deletePending failed', cause)
  }
}

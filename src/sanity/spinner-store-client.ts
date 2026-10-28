import 'server-only'

import { randomUUID } from 'node:crypto'

import { createClient, type SanityClient } from 'next-sanity'

import type { SpinnerStoreDoc } from '@/lib/types'

import { apiVersion, projectId } from './env'

/**
 * Spinner-rack stores — the private, server-only client.
 *
 * Same private-dataset + token model as the ownership map and Rag submissions
 * (ownership-client.ts, rag-submission-client.ts): stores live in `ndriot_auth`,
 * NEVER the world-readable `production` dataset, because they carry commission
 * terms, creator earnings, and payment status. Book/creator are denormalized
 * strings (no cross-dataset refs). Written only from admin-gated server actions.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) {
    throw new Error('Missing SANITY_WRITE_TOKEN / CREATOR_SCRIPT — spinner client cannot be created.')
  }
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

type RackItem = NonNullable<SpinnerStoreDoc['rack']>[number]
type Payout = NonNullable<SpinnerStoreDoc['payouts']>[number]

export async function listStores(): Promise<SpinnerStoreDoc[]> {
  try {
    return (
      (await client().fetch<SpinnerStoreDoc[]>(
        `*[_type=="spinnerStore"]|order(state asc, storeName asc)`,
      )) ?? []
    )
  } catch (cause) {
    console.error('[spinner] listStores failed', cause)
    return []
  }
}

export async function getStore(id: string): Promise<SpinnerStoreDoc | null> {
  try {
    // getDocument (direct, strongly consistent) rather than a GROQ query — right
    // after create()/patch() the query index lags a beat, so `*[_id==$id]` can
    // miss a just-written store and 404 the redirect. A direct id read doesn't.
    const doc = await client().getDocument(id)
    return (doc as SpinnerStoreDoc | undefined) ?? null
  } catch (cause) {
    console.error('[spinner] getStore failed', cause)
    return null
  }
}

export async function createStore(fields: {
  state: string
  storeName: string
  slug?: string
  storeCutPercent?: number
  ndRiotCutPercent?: number
}): Promise<string> {
  const doc = await client().create({
    _type: 'spinnerStore',
    status: 'active',
    ndRiotCutPercent: 0,
    ...fields,
  })
  return doc._id
}

/** Set top-level store fields (identity, commission, status, dates). */
export async function patchStoreMeta(
  id: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await client().patch(id).set(fields).commit()
}

/**
 * Append a book to the rack. Caller supplies the denormalized book/creator.
 * Idempotent on bookId — a title already on the rack is a no-op, so a stale
 * picker (or a double submit) can't duplicate a row.
 */
export async function addRackItem(
  id: string,
  item: Omit<RackItem, '_key' | '_type'>,
): Promise<void> {
  if (item.bookId) {
    const store = await getStore(id)
    if (store?.rack?.some((r) => r.bookId === item.bookId)) return
  }
  const member = { _key: randomUUID(), _type: 'rackItem', ...item }
  await client()
    .patch(id)
    .setIfMissing({ rack: [] })
    .insert('after', 'rack[-1]', [member])
    .commit()
}

/** Patch one rack item's editable fields (price, note, counts) by its key. */
export async function updateRackItem(
  id: string,
  key: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const set: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) set[`rack[_key=="${key}"].${k}`] = v
  await client().patch(id).set(set).commit()
}

export async function removeRackItem(id: string, key: string): Promise<void> {
  await client().patch(id).unset([`rack[_key=="${key}"]`]).commit()
}

/** Upsert a creator's payment record (keyed by creatorId). */
export async function recordPayout(
  id: string,
  creatorId: string,
  creatorName: string,
  fields: { paidTotal?: number; lastPaidDate?: string; notes?: string },
): Promise<void> {
  const store = await getStore(id)
  const exists = store?.payouts?.some((p) => p.creatorId === creatorId)
  if (exists) {
    const set: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) set[`payouts[creatorId=="${creatorId}"].${k}`] = v
    await client().patch(id).set(set).commit()
  } else {
    const member: Payout & { _key: string; _type: string } = {
      _key: randomUUID(),
      _type: 'payout',
      creatorId,
      creatorName,
      ...fields,
    }
    await client().patch(id).setIfMissing({ payouts: [] }).insert('after', 'payouts[-1]', [member]).commit()
  }
}

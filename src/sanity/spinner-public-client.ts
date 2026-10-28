import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * Spinner racks — the PUBLIC, read-only view.
 *
 * Stores live in the private `ndriot_auth` dataset (same client/token as
 * spinner-store-client.ts) because the raw doc carries commission terms,
 * earnings and payouts. This module is the one place a world-facing page may
 * read that doc, and it does so through NARROW, HAND-WRITTEN PROJECTIONS that
 * are the entire security boundary:
 *
 *   EXPOSED: store identity (name, state, slug, address, start date), and per
 *            item — title, slug, creator name, price, current stock, count date.
 *   NEVER:   storeCutPercent, ndRiotCutPercent, payouts, sold, shrink,
 *            contactName, contactEmail.
 *
 * Do not widen these projections to `*` or add a financial/contact field. Only
 * `status=="active"` stores are visible. Types are hand-written (generated
 * types don't reach a projection against a private-dataset doc): keep each
 * interface next to its query and review them together.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) {
    throw new Error('Missing SANITY_WRITE_TOKEN / CREATOR_SCRIPT — spinner public client cannot be created.')
  }
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

/** One active rack that carries a given comic — for the comic page's block. */
export interface PublicRackForBook {
  storeName: string | null
  state: string | null
  slug: string | null
  startDate: string | null
  lastCount: number | null
  lastCountDate: string | null
}

const RACKS_FOR_BOOK = `*[_type=="spinnerStore" && status=="active" && defined(slug) && $bookId in rack[].bookId]{
  storeName, state, slug, startDate,
  "lastCount": rack[bookId==$bookId][0].lastCount,
  "lastCountDate": rack[bookId==$bookId][0].lastCountDate
} | order(state asc, storeName asc)`

/** Active racks (if any) that carry this comic/Rag, newest-stock fields only. */
export async function racksForBook(bookId: string): Promise<PublicRackForBook[]> {
  if (!bookId) return []
  try {
    return (await client().fetch<PublicRackForBook[]>(RACKS_FOR_BOOK, { bookId })) ?? []
  } catch (cause) {
    console.error('[spinner-public] racksForBook failed', cause)
    return []
  }
}

/** One item on a public rack shelf. */
export interface PublicRackShelfItem {
  kind: 'book' | 'rag' | null
  bookTitle: string | null
  bookSlug: string | null
  creatorName: string | null
  lastCount: number | null
  lastCountDate: string | null
  price: number | null
}

/** A store's public shelf page (/racks/[slug]). */
export interface PublicRack {
  storeName: string | null
  state: string | null
  slug: string | null
  address: string | null
  startDate: string | null
  items: PublicRackShelfItem[]
}

const PUBLIC_RACK = `*[_type=="spinnerStore" && status=="active" && slug==$slug][0]{
  storeName, state, slug, address, startDate,
  "items": rack[]{ kind, bookTitle, bookSlug, creatorName, lastCount, lastCountDate, price }
}`

/** The active store at this slug, with its shelf ordered by creator then title. */
export async function getPublicRack(slug: string): Promise<PublicRack | null> {
  if (!slug) return null
  try {
    const rack = await client().fetch<PublicRack | null>(PUBLIC_RACK, { slug })
    if (!rack) return null
    const items = [...(rack.items ?? [])].sort((a, b) => {
      const byCreator = (a.creatorName ?? '').localeCompare(b.creatorName ?? '')
      return byCreator !== 0
        ? byCreator
        : (a.bookTitle ?? '').localeCompare(b.bookTitle ?? '')
    })
    return { ...rack, items }
  } catch (cause) {
    console.error('[spinner-public] getPublicRack failed', cause)
    return null
  }
}

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

/**
 * A sized store-logo URL from a raw Sanity CDN url.
 *
 * Served straight from cdn.sanity.io (not the img.ndriot.com proxy the rest of
 * the site's imagery uses): a store logo is admin-uploaded branding, not the
 * reader/creator-uploaded content that proxy exists to CSAM-scan, and going
 * direct avoids assuming the proxy mirrors this (private) dataset's asset path.
 * Sizing rides on query params, which the CDN honors on the bare asset URL.
 */
export function sizedLogoUrl(rawUrl: string | null, width = 240): string | null {
  if (!rawUrl) return null
  const sep = rawUrl.includes('?') ? '&' : '?'
  return `${rawUrl}${sep}w=${width}&auto=format&fit=max`
}

/**
 * The same, from a Sanity image asset `_ref` (the shape getStore() hands the
 * admin page, which reads the raw doc rather than a deref'd projection).
 */
export function logoUrlFromRef(
  ref: string | null | undefined,
  width = 240,
): string | null {
  if (!ref) return null
  const m = /^image-([0-9a-f]+)-(\d+x\d+)-(\w+)$/.exec(ref)
  if (!m) return null
  const raw = `https://cdn.sanity.io/images/${projectId}/${DATASET}/${m[1]}-${m[2]}.${m[3]}`
  return sizedLogoUrl(raw, width)
}

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) {
    throw new Error('Missing SANITY_WRITE_TOKEN / CREATOR_SCRIPT — spinner public client cannot be created.')
  }
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

/** One active rack that carries a given comic — for the comic page's "In person"
 *  list: just enough to render a logo + store name + state, linked to the shelf. */
export interface PublicRackForBook {
  storeName: string | null
  state: string | null
  slug: string | null
  /** Sized (small) logo URL, or null when the store has no logo. */
  logoUrl: string | null
}

const RACKS_FOR_BOOK = `*[_type=="spinnerStore" && status=="active" && defined(slug) && $bookId in rack[].bookId]{
  storeName, state, slug,
  "logoRaw": logo.asset->url
} | order(state asc, storeName asc)`

type RackForBookRaw = Omit<PublicRackForBook, 'logoUrl'> & { logoRaw: string | null }

/** Active racks (if any) that carry this comic/Rag, each with a small logo. */
export async function racksForBook(bookId: string): Promise<PublicRackForBook[]> {
  if (!bookId) return []
  try {
    const rows =
      (await client().fetch<RackForBookRaw[]>(RACKS_FOR_BOOK, { bookId })) ?? []
    // 90px source for a 30px mark — crisp on retina.
    return rows.map(({ logoRaw, ...r }) => ({
      ...r,
      logoUrl: sizedLogoUrl(logoRaw, 90),
    }))
  } catch (cause) {
    console.error('[spinner-public] racksForBook failed', cause)
    return []
  }
}

/** One item on a public rack shelf. */
export interface PublicRackShelfItem {
  kind: 'book' | 'rag' | null
  bookId: string | null
  bookTitle: string | null
  bookSlug: string | null
  creatorName: string | null
  creatorSlug: string | null
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
  /** Sized, ready-to-use logo URL (null when the store has no logo). */
  logoUrl: string | null
  items: PublicRackShelfItem[]
}

const PUBLIC_RACK = `*[_type=="spinnerStore" && status=="active" && slug==$slug][0]{
  storeName, state, slug, address, startDate,
  "logoRaw": logo.asset->url,
  "items": rack[]{ kind, bookId, bookTitle, bookSlug, creatorName, creatorSlug, lastCount, lastCountDate, price }
}`

/** The raw projection shape before logo post-processing. */
type PublicRackRaw = Omit<PublicRack, 'logoUrl'> & { logoRaw: string | null }

/**
 * The active store at this slug, its shelf ordered by creator then title.
 *
 * `prioritizeCreatorSlug` floats one creator's books to the top (keeping the
 * neutral order within each group) — set when the reader clicked through from
 * that creator's profile, so it's an explicit, user-directed sort, not an
 * inferred ranking (§3). On a direct visit the shelf stays fully neutral.
 */
export async function getPublicRack(
  slug: string,
  prioritizeCreatorSlug?: string | null,
): Promise<PublicRack | null> {
  if (!slug) return null
  try {
    const rack = await client().fetch<PublicRackRaw | null>(PUBLIC_RACK, { slug })
    if (!rack) return null
    const items = [...(rack.items ?? [])].sort((a, b) => {
      const byCreator = (a.creatorName ?? '').localeCompare(b.creatorName ?? '')
      return byCreator !== 0
        ? byCreator
        : (a.bookTitle ?? '').localeCompare(b.bookTitle ?? '')
    })
    if (prioritizeCreatorSlug) {
      // Stable second pass — Array.sort is stable, so matched items keep their
      // neutral creator→title order, just hoisted above the rest.
      items.sort(
        (a, b) =>
          (a.creatorSlug === prioritizeCreatorSlug ? 0 : 1) -
          (b.creatorSlug === prioritizeCreatorSlug ? 0 : 1),
      )
    }
    const { logoRaw, ...rest } = rack
    // 480 so the shelf-header logo (up to ~96×300) stays crisp on retina.
    return { ...rest, items, logoUrl: sizedLogoUrl(logoRaw, 480) }
  } catch (cause) {
    console.error('[spinner-public] getPublicRack failed', cause)
    return null
  }
}

const RACKS_FOR_CREATOR = `*[_type=="spinnerStore" && status=="active" && defined(slug) && $creatorId in rack[].creatorId]{
  storeName, state, slug,
  "logoRaw": logo.asset->url
} | order(state asc, storeName asc)`

/** Active racks that carry any of a creator's books — for the "Stores that carry
 *  …" box on their profile. Same safe shape as racksForBook. */
export async function racksForCreator(creatorId: string): Promise<PublicRackForBook[]> {
  if (!creatorId) return []
  try {
    const rows =
      (await client().fetch<RackForBookRaw[]>(RACKS_FOR_CREATOR, { creatorId })) ?? []
    return rows.map(({ logoRaw, ...r }) => ({
      ...r,
      logoUrl: sizedLogoUrl(logoRaw, 90),
    }))
  } catch (cause) {
    console.error('[spinner-public] racksForCreator failed', cause)
    return []
  }
}

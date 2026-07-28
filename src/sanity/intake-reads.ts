import 'server-only'

import { getWriteClient } from './write-client'

/**
 * Fetch an intake document's editable values, preferring the unpublished DRAFT
 * over the published version.
 *
 * A creator's edits land in `drafts.<id>` and wait for review. If they edit
 * again before it's published, they should see their pending changes — not the
 * last-published state — otherwise a field they only ever added in the draft
 * (a genre, a format) looks like it vanished, and re-submitting can overwrite
 * it. The public read client can't see drafts, so this uses the write client
 * (token). Resilient: any error returns null, and the form falls back to empty.
 *
 * A lingering draft means unpublished changes — publishing removes the draft —
 * so "prefer the draft" is always the right read here.
 */
export async function editableDraftPreferred<T>(query: string, id: string): Promise<T | null> {
  try {
    const client = getWriteClient()
    const draft = await client.fetch<T | null>(query, { id: `drafts.${id}` })
    if (draft) return draft
    return await client.fetch<T | null>(query, { id })
  } catch (cause) {
    console.error('[intake-reads] editable fetch failed', cause)
    return null
  }
}

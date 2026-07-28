import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from './env'

/**
 * Server-only Sanity client with WRITE access.
 *
 * The token grants create/patch/delete on the production dataset, so this
 * module must never reach the browser. `import 'server-only'` makes importing
 * it from a Client Component a build error — the compiler enforces the one
 * boundary the whole native-intake security model rests on (AGENTS.md; the
 * native-intake brief). Import this ONLY from a `'use server'` action.
 *
 * The public read client (`./client`) stays token-free and `useCdn: true`.
 * This one sets `useCdn: false`: writes and any read-after-write must hit the
 * live API, never a cached edge.
 *
 * Created lazily and cached, so a request path that never writes pays nothing,
 * and a missing token surfaces as a caught error in the action (which degrades
 * gracefully, like the contact action) rather than a crash at import.
 */

let cached: SanityClient | null = null

export function getWriteClient(): SanityClient {
  if (cached) return cached

  // Same names loadToken() reads in the import scripts, so a single provisioned
  // token serves both the scripts and the on-site forms.
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) {
    throw new Error(
      'Missing SANITY_WRITE_TOKEN / CREATOR_SCRIPT — the intake write client cannot be created.',
    )
  }

  cached = createClient({ projectId, dataset, apiVersion, useCdn: false, token })
  return cached
}

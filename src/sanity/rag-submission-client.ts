import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { apiVersion, projectId } from './env'

/**
 * Write/read client for ND Riot Rag submissions.
 *
 * Same private-dataset + token model as the ownership map and reader saves
 * (ownership-client.ts, reader-client.ts): submissions live in `ndriot_auth`,
 * NEVER the world-readable `production` dataset, because they carry the
 * submitter's email and an unpublished pitch. Server-only — the token must never
 * reach the browser.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

export function getSubmissionClient(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) {
    throw new Error(
      'Missing SANITY_WRITE_TOKEN / CREATOR_SCRIPT — the submission client cannot be created.',
    )
  }
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

export interface RagSubmissionDecision {
  _id: string
  status: string
  /** The reviewer's optional note, typed on the document (liveEdit) before deciding. */
  decisionNote: string | null
  submitterEmail: string | null
  submitterName: string | null
  creatorName: string | null
  issueTitle: string | null
  issueNumber: number | null
}

/** One submission's reply details — read by the decision API before it emails. */
export async function getSubmissionForDecision(
  id: string,
): Promise<RagSubmissionDecision | null> {
  try {
    return (
      (await getSubmissionClient().fetch<RagSubmissionDecision | null>(
        `*[_type=="ragSubmission" && _id==$id][0]{_id,status,decisionNote,submitterEmail,submitterName,creatorName,issueTitle,issueNumber}`,
        { id },
      )) ?? null
    )
  } catch (cause) {
    console.error('[rag-submission] decision read failed', cause)
    return null
  }
}

/** Record the review outcome after the reply email is sent (liveEdit: no draft). */
export async function setSubmissionStatus(id: string, status: string): Promise<void> {
  await getSubmissionClient().patch(id).set({ status }).commit()
}

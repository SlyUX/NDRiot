import 'server-only'

import { createClient, type SanityClient } from 'next-sanity'

import { emailHmac } from '@/lib/email-hash'

import { apiVersion, projectId } from './env'

/**
 * Reader/creator ACCOUNT records — the age-affirmation + terms-acceptance state
 * behind the content gate. Stored in the private `ndriot_auth` dataset (same
 * store as ownership/reader saves), never the public production dataset.
 *
 * PRIVACY, non-negotiable:
 *  - The document is keyed by `account.<emailHmac>`; the plaintext email is
 *    NEVER stored, and neither is the raw date of birth.
 *  - Only two derived booleans (isOver13 / isOver18), the toggle, and terms
 *    metadata are persisted. The DOB exists only in the /welcome request handler
 *    and is discarded there — do NOT add a dateOfBirth field, ever, not even
 *    "temporarily during signup".
 *  - `matureEnabled` is validated server-side against `isOver18` on every write;
 *    a 13–17 account can never enable Mature. Never trust the client toggle.
 *
 * All reads fail-soft (a store hiccup must not break a page); writes surface
 * errors to the caller (an action) so onboarding can retry.
 */

const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

let cached: SanityClient | null = null

function client(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN — account client cannot be created.')
  cached = createClient({ projectId, dataset: DATASET, apiVersion, useCdn: false, token })
  return cached
}

export interface Account {
  isOver13: boolean
  isOver18: boolean
  matureEnabled: boolean
  termsVersion: string | null
  ageAffirmedAt: string | null
  termsAcceptedAt: string | null
}

const accountId = (email: string) => `account.${emailHmac(email)}`

/** Whether an account exists for this email, and its current state. Fail-soft. */
export async function getAccount(email: string): Promise<Account | null> {
  if (!email) return null
  try {
    return await client().fetch<Account | null>(
      `*[_id==$id][0]{isOver13, isOver18, matureEnabled, termsVersion, ageAffirmedAt, termsAcceptedAt}`,
      { id: accountId(email) },
    )
  } catch (cause) {
    console.error('[account] getAccount failed', cause)
    return null
  }
}

/**
 * Create the account after the age screen. `isOver18` is computed in the handler
 * from a DOB that is NOT passed here (only the boolean is). `matureEnabled`
 * always starts false. Idempotent.
 */
export async function createAccount(input: {
  email: string
  isOver13: boolean
  isOver18: boolean
  termsVersion: string
}): Promise<void> {
  const now = new Date().toISOString()
  await client().createIfNotExists({
    _id: accountId(input.email),
    _type: 'account',
    isOver13: input.isOver13,
    isOver18: input.isOver18,
    matureEnabled: false,
    ageAffirmedAt: now,
    termsVersion: input.termsVersion,
    termsAcceptedAt: now,
  })
}

/** Record acceptance of a (new) terms version — for the re-prompt on a bump. */
export async function acceptTerms(email: string, termsVersion: string): Promise<void> {
  await client()
    .patch(accountId(email))
    .set({ termsVersion, termsAcceptedAt: new Date().toISOString() })
    .commit()
}

/**
 * Toggle Mature content. Server-validated: forced false unless the account is
 * 18+. Returns the resulting state (false if the account can't view Mature).
 */
export async function setMatureEnabled(email: string, enabled: boolean): Promise<boolean> {
  const account = await getAccount(email)
  const allowed = Boolean(account?.isOver18) && enabled
  await client().patch(accountId(email)).set({ matureEnabled: allowed }).commit()
  return allowed
}

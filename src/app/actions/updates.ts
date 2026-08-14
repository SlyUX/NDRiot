'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { UPDATE_KINDS, type UpdateKind } from '@/lib/taxonomy'
import { creatorsOwnedBy } from '@/sanity/ownership-client'
import { getWriteClient } from '@/sanity/write-client'

/**
 * Post a creator update — a short note on a comic or creator profile.
 *
 * Direct-publish (no review queue): updates are short, ephemeral, and
 * owner-curated. Ownership-gated — you can only post to a creator you own, or a
 * comic under one of your creators (ownership is inherited, like the intake).
 * The reader feed (Save = Follow) is recency-only, never ranked (§3).
 */
const BODY_LIMIT = 200
/** Cap on how many creators/conventions one update can reference. */
const MENTION_CAP = 8

export type PostUpdateState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  /** Increments only on success, so the composer can clear itself by re-keying. */
  nonce: number
}

export async function postUpdate(
  prev: PostUpdateState,
  formData: FormData,
): Promise<PostUpdateState> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return { status: 'error', message: 'Your session expired — please sign in again.', nonce: prev.nonce }

  const targetId = String(formData.get('targetId') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const mentionIds = formData
    .getAll('mentions')
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, MENTION_CAP)
  const rawKind = String(formData.get('kind') ?? '').trim()
  const kind: UpdateKind = (UPDATE_KINDS as readonly string[]).includes(rawKind)
    ? (rawKind as UpdateKind)
    : 'General news'
  if (!targetId) return { status: 'error', message: 'Pick what this update is about.', nonce: prev.nonce }
  if (!body) return { status: 'error', message: 'Write a short update first.', nonce: prev.nonce }
  if (body.length > BODY_LIMIT)
    return { status: 'error', message: `Keep it under ${BODY_LIMIT} characters.`, nonce: prev.nonce }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    console.error('[updates] write client unavailable', cause)
    return { status: 'error', message: 'Posting is temporarily unavailable — try again shortly.', nonce: prev.nonce }
  }

  // Gate: a creator you own, or a comic whose creator you own.
  const ownedCreatorIds = new Set(await creatorsOwnedBy(email))
  let allowed = ownedCreatorIds.has(targetId)
  if (!allowed) {
    try {
      const book = await client.fetch<{ creatorRef?: string } | null>(
        `*[_id==$id && _type=="book"][0]{"creatorRef":creator._ref}`,
        { id: targetId },
      )
      allowed = Boolean(book?.creatorRef && ownedCreatorIds.has(book.creatorRef))
    } catch (cause) {
      console.error('[updates] target ownership check failed', cause)
    }
  }
  if (!allowed)
    return { status: 'error', message: 'You can only post to a creator or comic you own.', nonce: prev.nonce }

  // Keep only mention ids that are real creators/conventions — no dangling refs
  // from a tampered form.
  let validMentions: string[] = []
  if (mentionIds.length) {
    try {
      validMentions = await client.fetch<string[]>(
        `*[_type in ["creator","convention"] && _id in $ids]._id`,
        { ids: mentionIds },
      )
    } catch (cause) {
      console.error('[updates] mention check failed', cause)
    }
  }

  try {
    await client.create({
      _type: 'update',
      kind,
      body: body.slice(0, BODY_LIMIT),
      target: { _type: 'reference', _ref: targetId },
      ...(validMentions.length
        ? { mentions: validMentions.map((id) => ({ _type: 'reference', _ref: id, _key: id })) }
        : {}),
      publishedAt: new Date().toISOString(),
    })
  } catch (cause) {
    console.error('[updates] post failed', cause)
    return { status: 'error', message: 'That didn’t post — please try again.', nonce: prev.nonce }
  }

  revalidatePath('/me')
  return { status: 'success', nonce: prev.nonce + 1 }
}

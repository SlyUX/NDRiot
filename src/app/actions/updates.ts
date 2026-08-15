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

/** Whether `email` owns an update's target — a creator, or a comic under one. */
async function ownsTarget(
  client: ReturnType<typeof getWriteClient>,
  email: string,
  targetId: string,
): Promise<boolean> {
  const ownedCreatorIds = new Set(await creatorsOwnedBy(email))
  if (ownedCreatorIds.has(targetId)) return true
  try {
    const book = await client.fetch<{ creatorRef?: string } | null>(
      `*[_id==$id && _type=="book"][0]{"creatorRef":creator._ref}`,
      { id: targetId },
    )
    return Boolean(book?.creatorRef && ownedCreatorIds.has(book.creatorRef))
  } catch (cause) {
    console.error('[updates] target ownership check failed', cause)
    return false
  }
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
  if (!(await ownsTarget(client, email, targetId)))
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

export type UpdateActionResult = { ok: boolean }

/**
 * Delete one of your own updates (from your profile). Ownership-gated on the
 * update's target. Commits immediately; the profile offers an in-place Undo that
 * re-creates it via `restoreUpdate` — so nothing rides a timer holding data.
 */
export async function deleteUpdate(updateId: string): Promise<UpdateActionResult> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email || !updateId) return { ok: false }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    console.error('[updates] write client unavailable', cause)
    return { ok: false }
  }

  let targetRef: string | undefined
  try {
    const doc = await client.fetch<{ targetRef?: string } | null>(
      `*[_id==$id && _type=="update"][0]{"targetRef":target._ref}`,
      { id: updateId },
    )
    targetRef = doc?.targetRef
  } catch (cause) {
    console.error('[updates] delete target lookup failed', cause)
  }
  if (!targetRef || !(await ownsTarget(client, email, targetRef))) return { ok: false }

  try {
    await client.delete(updateId)
  } catch (cause) {
    console.error('[updates] delete failed', cause)
    return { ok: false }
  }

  revalidatePath('/me')
  return { ok: true }
}

/** The data an in-place Undo carries to re-create a just-deleted update. */
export type RestoreUpdatePayload = {
  id: string
  kind: string
  body: string
  targetId: string
  mentionIds: string[]
  publishedAt: string
}

/**
 * Undo a delete — re-create the update with its ORIGINAL `_id` (so a later
 * delete targets the same doc) and original `publishedAt` (so it keeps its feed
 * position). Ownership-gated on the target, same as posting.
 */
export async function restoreUpdate(payload: RestoreUpdatePayload): Promise<UpdateActionResult> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email || !payload.id || !payload.targetId) return { ok: false }

  let client
  try {
    client = getWriteClient()
  } catch (cause) {
    console.error('[updates] write client unavailable', cause)
    return { ok: false }
  }

  if (!(await ownsTarget(client, email, payload.targetId))) return { ok: false }

  const kind: UpdateKind = (UPDATE_KINDS as readonly string[]).includes(payload.kind)
    ? (payload.kind as UpdateKind)
    : 'General news'

  let validMentions: string[] = []
  if (payload.mentionIds?.length) {
    try {
      validMentions = await client.fetch<string[]>(
        `*[_type in ["creator","convention"] && _id in $ids]._id`,
        { ids: payload.mentionIds.slice(0, MENTION_CAP) },
      )
    } catch (cause) {
      console.error('[updates] restore mention check failed', cause)
    }
  }

  try {
    await client.createIfNotExists({
      _id: payload.id,
      _type: 'update',
      kind,
      body: payload.body.slice(0, BODY_LIMIT),
      target: { _type: 'reference', _ref: payload.targetId },
      ...(validMentions.length
        ? { mentions: validMentions.map((mid) => ({ _type: 'reference', _ref: mid, _key: mid })) }
        : {}),
      publishedAt: payload.publishedAt,
    })
  } catch (cause) {
    console.error('[updates] restore failed', cause)
    return { ok: false }
  }

  revalidatePath('/me')
  return { ok: true }
}

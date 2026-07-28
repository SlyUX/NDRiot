import 'server-only'

import { getWriteClient } from '@/sanity/write-client'

// 8MB is generous for a cover or avatar and bounds resource abuse; the floor
// rejects empty or truncated uploads.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MIN_IMAGE_BYTES = 1024

export type UploadResult = { assetId: string } | { error: string }

/**
 * Upload a browser-submitted image `File` to Sanity's asset store via the
 * server-only write client, returning the bare asset `_id`. The caller wraps
 * it into the `imageWithAlt` / reference shape — mirroring the importer, where
 * `uploadImage` also returns a bare id, not a reference object.
 *
 * Type and size are validated HERE, server-side — the form's `accept` attribute
 * is a hint a client can bypass, so it is never trusted. Non-fatal by contract:
 * the caller treats an `{ error }` as "skip the image and note it", so one bad
 * upload never sinks an otherwise-good submission.
 */
export async function uploadImageFile(file: File, filename: string): Promise<UploadResult> {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return { error: 'no file supplied' }
  }
  if (!file.type.startsWith('image/')) {
    return { error: `expected an image, got ${file.type || 'an unknown type'}` }
  }
  if (file.size < MIN_IMAGE_BYTES) return { error: 'the file looks empty or truncated' }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `image is ${(file.size / 1024 / 1024).toFixed(1)}MB; the max is 8MB` }
  }

  try {
    const asset = await getWriteClient().assets.upload('image', file, { filename })
    return { assetId: asset._id }
  } catch (cause) {
    console.error('[intake] image upload failed', cause)
    return { error: 'the upload failed — please try again' }
  }
}

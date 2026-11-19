import type { SanityImageSource } from '@sanity/image-url'

import { urlForAuth } from '@/sanity/image'

/**
 * Build the display URL for an attached forum-post image. The asset lives in the
 * private `ndriot_auth` dataset, so it goes through `urlForAuth` (same
 * img.ndriot.com proxy → CSAM-scanned). Returns null when there's no image.
 *
 * Width-only cap (`fit('max')` → never upscales), which PRESERVES aspect ratio.
 * A forum column is wider than a chat bubble, so this caps at 1080 (vs the
 * message pipeline's 380); the client already bounded the stored image to
 * 1080×1350, so capping the display width is all that's needed. Same reasoning
 * as src/lib/messages.ts — see that file for why width-only, not width+height.
 *
 * Pure and server-safe; called where posts are projected for the client, so the
 * client only ever receives a string.
 */
export function forumImageUrl(
  image: SanityImageSource | null | undefined,
): string | null {
  if (!image || typeof image !== 'object') return null
  const asset = (image as { asset?: { _ref?: string } }).asset
  if (!asset?._ref) return null
  return urlForAuth(image).width(1080).fit('max').url()
}

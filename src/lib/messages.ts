import type { SanityImageSource } from '@sanity/image-url'

import { urlForAuth } from '@/sanity/image'

/**
 * Build the display URL for a shared message image. The asset lives in the
 * private `ndriot_auth` dataset, so it goes through `urlForAuth` (same
 * img.ndriot.com proxy → CSAM-scanned). Returns null when there's no image.
 *
 * Width-only cap (`fit('max')` → never upscales), which PRESERVES the aspect
 * ratio. Passing both width AND height makes Sanity crop the source to the box's
 * aspect (a 380×1080 box would slice a tall sliver out of a wide image), which is
 * not what we want — the client already bounded the stored image to 380×1080, so
 * capping the display width is all that's needed.
 *
 * Pure and server-safe; called where messages are projected for the client
 * (the /me page and the poll action), so the client only ever receives a string.
 */
export function messageImageUrl(
  image: SanityImageSource | null | undefined,
): string | null {
  if (!image || typeof image !== 'object') return null
  const asset = (image as { asset?: { _ref?: string } }).asset
  if (!asset?._ref) return null
  return urlForAuth(image).width(380).fit('max').url()
}

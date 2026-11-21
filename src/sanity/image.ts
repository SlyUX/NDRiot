import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { dataset, projectId } from './env'

/**
 * Image URLs are built against img.ndriot.com — a Cloudflare Worker that fronts
 * Sanity's CDN (cloudflare/img-proxy-worker.js) — instead of cdn.sanity.io
 * directly. That routes every image through Cloudflare's cache so the CSAM
 * Scanning Tool can hash it (it only sees cache-served content). The path after
 * the host is byte-identical to Sanity's, which the Worker mirrors 1:1, so
 * `baseUrl` is the only change — every `urlFor()` call site is unaffected.
 */
const IMAGE_BASE_URL = 'https://img.ndriot.com'

const builder = createImageUrlBuilder({ projectId, dataset, baseUrl: IMAGE_BASE_URL })

export const urlFor = (source: SanityImageSource) => builder.image(source)

/**
 * Image URLs for assets in the PRIVATE `ndriot_auth` dataset (message images).
 * Assets live per-dataset, so these need their own builder — same img.ndriot.com
 * proxy, so a shared chat photo is CSAM-scanned like every other image. Called
 * server-side only (message rendering), so the dataset name need not be public.
 */
const AUTH_DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

const authBuilder = createImageUrlBuilder({
  projectId,
  dataset: AUTH_DATASET,
  baseUrl: IMAGE_BASE_URL,
})

export const urlForAuth = (source: SanityImageSource) => authBuilder.image(source)

/**
 * next/image blur-up props from a Sanity image's `lqip` — the tiny base64
 * data-URL Sanity generates per asset (`asset->metadata.lqip`), projected onto
 * the image object in the card queries. Spread onto a next/image:
 * `<Image {...blurProps(img)} … />`.
 *
 * Null-safe: no lqip (field not projected, or an asset predating metadata) → an
 * empty object, so the image keeps the default empty placeholder exactly as
 * before. The `lqip` param is declared here so a plain `SanityImage` — whose
 * alias doesn't name lqip — still passes; the value flows through at runtime.
 */
export function blurProps(
  image: { lqip?: string | null } | null | undefined,
): { placeholder: 'blur'; blurDataURL: string } | Record<string, never> {
  const lqip = image?.lqip
  return lqip ? { placeholder: 'blur', blurDataURL: lqip } : {}
}

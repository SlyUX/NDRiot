import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/lib/types'

/**
 * Shared pieces for the Open Graph image routes.
 *
 * These images are rendered by Satori, which is not a browser: it supports a
 * subset of CSS, has no grid, no `gap` shorthand in older versions, and every
 * element that contains more than one child needs an explicit `display: flex`.
 * Layout that works in the app will not necessarily work here.
 */

/** Facebook, LinkedIn, X and Slack all crop toward this. */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

/** Straight from AGENTS.md §9 — Satori cannot read CSS variables. */
export const OG_COLORS = {
  background: '#030303',
  foreground: '#FFFFFF',
  primary: '#FF0095',
  primaryForeground: '#000000',
  muted: '#A1A1AA',
} as const

/**
 * Loaded once per module instance rather than per request. Satori needs the
 * bytes, and reading a 73KB file on every share-card render is wasted work.
 */
let fontCache: Buffer | null = null

export async function loadHeadingFont(): Promise<Buffer> {
  if (!fontCache) {
    fontCache = await readFile(join(process.cwd(), 'assets', 'Geist-Black.ttf'))
  }
  return fontCache
}

export async function ogFonts() {
  const data = await loadHeadingFont()
  return [{ name: 'Geist', data, style: 'normal' as const, weight: 900 as const }]
}

/**
 * The logo, inlined as a data URI.
 *
 * Satori can fetch a remote image, but pointing the site at itself to render
 * its own share card adds a network round trip and a way for the image to
 * fail. Reading the file is neither.
 */
let logoCache: string | null = null

export async function logoDataUri(): Promise<string> {
  if (!logoCache) {
    const svg = await readFile(join(process.cwd(), 'public', 'nd-riot-logo.svg'), 'utf8')
    logoCache = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }
  return logoCache
}

/**
 * Builds a Sanity image URL that Satori can actually decode.
 *
 * Satori has no WebP support, and Sanity serves WebP by default for any
 * source that is not already a JPEG — so a PNG or TIF upload renders as an
 * empty box in the share card while a JPEG of the same picture works. It
 * fails silently: valid PNG out, image missing from it.
 *
 * `fm=jpg` forces a format Satori understands. Always route OG artwork
 * through here rather than calling urlFor directly.
 */
export function ogImageUrl(image: SanityImage, width: number, height: number): string {
  return urlFor(image).width(width).height(height).format('jpg').url()
}

/**
 * Truncates on a word boundary so a long title degrades into something
 * readable rather than being clipped mid-render by the layout engine.
 */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
}

import type { Metadata } from 'next'

import { absoluteUrl } from '@/lib/site-url'

/**
 * Per-page SEO metadata: a distinct `<title>`, a description, a self-canonical
 * (so filter params and www/apex don't split ranking), and matching OpenGraph.
 *
 * Without this, every detail page inherited the root layout's title — one title
 * tag across the entire catalogue, which search engines read as duplicate
 * content and which tells them nothing about the specific comic or maker.
 */
export function pageMetadata(input: {
  /** The page's own name — the comic/maker/article title. */
  title: string
  description?: string | null
  /** Site-root-relative path, used for the canonical + OG url. */
  path: string
  /** The full site title from settings; the bare brand is taken from it. */
  siteTitle: string
}): Metadata {
  const canonical = absoluteUrl(input.path)
  const brand = input.siteTitle.split(':')[0].trim()
  const title = `${input.title} · ${brand}`
  const description = input.description?.trim() || undefined

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
  }
}

import type { SiteSettings } from '@/lib/site-settings'
import { SITE_URL, absoluteUrl } from '@/lib/site-url'
import type { SanityImage } from '@/lib/types'
import { urlFor } from '@/sanity/image'

/**
 * schema.org builders for the JSON-LD blocks (rendered by <JsonLd>).
 *
 * The goal is GEO as much as SEO: an AI answer engine reading ndriot.com should
 * come away knowing this is a comic, by this maker, in these genres — as data,
 * not inferred from the surrounding prose. Every node is stable-`@id`'d off the
 * canonical URL so the graph cross-references cleanly.
 */

const ORG_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

/** Wrap one or more nodes in a schema.org @graph. */
export function jsonLdGraph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}

/** Drop undefined keys so optional fields simply don't appear. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

function img(image: SanityImage | null | undefined, w: number, h?: number): string | undefined {
  if (!image) return undefined
  const base = urlFor(image).width(w)
  return (h ? base.height(h) : base).url()
}

function clip(text: string | null | undefined, max = 300): string | undefined {
  const t = (text ?? '').trim()
  if (!t) return undefined
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/** The bare brand, before the tagline colon. */
function brand(settings: SiteSettings): string {
  return settings.siteTitle.split(':')[0].trim()
}

export function organizationSchema(settings: SiteSettings) {
  const sameAs = [
    ...settings.socialLinks.map((s) => s.url),
    ...(settings.discordUrl ? [settings.discordUrl] : []),
  ]
  return compact({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: brand(settings),
    url: SITE_URL,
    logo: absoluteUrl('/icon-512.png'),
    description: settings.siteDescription,
    sameAs: sameAs.length ? sameAs : undefined,
  })
}

export function websiteSchema(settings: SiteSettings) {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: brand(settings),
    url: SITE_URL,
    description: settings.siteDescription,
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/books?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function comicSchema(input: {
  title: string
  url: string
  cover?: SanityImage | null
  authorName?: string | null
  genres?: readonly string[] | null
  description?: string | null
}) {
  return compact({
    '@type': 'Book',
    '@id': `${input.url}#comic`,
    name: input.title,
    url: input.url,
    image: img(input.cover, 800),
    author: input.authorName ? { '@type': 'Person', name: input.authorName } : undefined,
    genre: input.genres?.length ? [...input.genres] : undefined,
    description: clip(input.description),
    publisher: { '@id': ORG_ID },
    inLanguage: 'en',
  })
}

export function comicMakerSchema(input: {
  name: string
  url: string
  photo?: SanityImage | null
  bio?: string | null
  socials?: readonly { url: string }[] | null
}) {
  const sameAs = (input.socials ?? []).map((s) => s.url).filter(Boolean)
  return compact({
    '@type': 'Person',
    '@id': `${input.url}#person`,
    name: input.name,
    url: input.url,
    image: img(input.photo, 600, 600),
    description: clip(input.bio),
    sameAs: sameAs.length ? sameAs : undefined,
  })
}

export function articleSchema(input: {
  title: string
  url: string
  authorName?: string | null
  datePublished?: string | null
  cover?: SanityImage | null
}) {
  return compact({
    '@type': 'Article',
    '@id': `${input.url}#article`,
    headline: input.title,
    url: input.url,
    mainEntityOfPage: input.url,
    author: input.authorName ? { '@type': 'Person', name: input.authorName } : undefined,
    datePublished: input.datePublished ?? undefined,
    image: img(input.cover, 1200, 630),
    publisher: { '@id': ORG_ID },
  })
}

/** A trail of {name, path} from Home to the current page. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}

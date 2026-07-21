import type { MetadataRoute } from 'next'

import { absoluteUrl, SITE_URL } from '@/lib/site-url'

/**
 * `/studio` is disallowed because it is an application, not content: crawling
 * it wastes budget on a route that renders nothing useful without a login.
 *
 * `/styleguide` already carries a `noindex` in its own metadata. Listing it
 * here as well is belt and braces — a crawler that ignores robots.txt still
 * meets the meta tag, and one that never fetches the page never meets it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/studio', '/styleguide'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}

/**
 * The site's canonical origin, for absolute URLs.
 *
 * Sitemaps, robots.txt and Open Graph tags all require absolute URLs — a
 * relative path in an OG tag simply does not resolve when a social platform
 * fetches it from its own servers.
 *
 * Vercel exposes the deployment URL, but preview deployments get a different
 * one each time, and a sitemap that points at a preview is worse than none.
 * So the production domain is the default and the env var is the override,
 * not the reverse.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://ndriot.com'

/** Joins a path onto the origin without doubling or dropping the slash. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

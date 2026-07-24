import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Redirects mixed/upper-case paths to their lowercase form, so /Books lands on
 * /books rather than a 404. The top-level routes are static and case-sensitive,
 * and a capitalised URL — typed, or shared with an initial cap — would
 * otherwise dead-end. A 308 makes it the permanent canonical for search engines.
 *
 * In Next 16 this file is "Proxy", the renamed Middleware (same behaviour).
 *
 * Two exclusions:
 *  - /categories/<genre> — genres are the raw taxonomy strings ("Horror",
 *    "Sci-Fi"), so their case is meaningful; lowercasing would empty the page.
 *  - /studio — Sanity owns its own routing there; we don't touch it.
 *
 * Book and creator slugs are always lowercase kebab-case, so lowercasing a
 * mis-typed slug only ever corrects it.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const lower = pathname.toLowerCase()

  if (pathname === lower) return
  if (lower.startsWith('/categories/')) return
  if (lower.startsWith('/studio')) return

  const url = request.nextUrl.clone()
  url.pathname = lower
  return NextResponse.redirect(url, 308)
}

export const config = {
  // Page routes only — skip Next internals, the API, and anything with a file
  // extension (static assets).
  matcher: ['/((?!_next|api|.*\\.).*)'],
}

import type { MetadataRoute } from 'next'

import { getSiteSettings } from '@/lib/site-settings'

/**
 * Web App Manifest — makes ndriot.com installable ("Add to Home Screen") with a
 * real app-like launch: standalone window, the brand mark as the icon, and the
 * near-black surface as the splash/theme.
 *
 * Deliberately no service worker (see the platform-recognition scope): this is
 * installable-lite — the recognition wins without offline-cache maintenance.
 *
 * Name and description come from Sanity (AGENTS.md §2); `short_name` is the bare
 * brand, taken from the part of the title before the tagline colon.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings()
  const shortName = settings.siteTitle.split(':')[0].trim()

  return {
    name: settings.siteTitle,
    short_name: shortName,
    description: settings.siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#030303',
    theme_color: '#030303',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

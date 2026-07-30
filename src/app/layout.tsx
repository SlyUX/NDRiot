import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Geist } from 'next/font/google'

import { cn } from '@/lib/utils'
import { getSiteSettings } from '@/lib/site-settings'
import { SITE_URL } from '@/lib/site-url'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

/**
 * Tints the mobile browser chrome and the installed-app splash in the site's
 * near-black — so the frame around the page matches the page.
 */
export const viewport: Viewport = {
  themeColor: '#030303',
}

/**
 * Metadata is generated rather than static so the title and description come
 * from Sanity — AGENTS.md §2 counts SEO copy as editor-managed.
 *
 * `metadataBase` resolves the file-convention OG/icons to absolute ndriot.com
 * URLs (crawlers fetch them from their own servers, so relative paths break);
 * the Apple tags make an iOS home-screen launch behave like an app.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const shortName = settings.siteTitle.split(':')[0].trim()

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: shortName,
    title: settings.siteTitle,
    description: settings.siteDescription,
    appleWebApp: { capable: true, title: shortName, statusBarStyle: 'black' },
    openGraph: {
      title: settings.siteTitle,
      description: settings.siteDescription,
      siteName: shortName,
      url: SITE_URL,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.siteTitle,
      description: settings.siteDescription,
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}

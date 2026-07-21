import type { Metadata } from 'next'
import './globals.css'
import { Geist } from 'next/font/google'

import { cn } from '@/lib/utils'
import { getSiteSettings } from '@/lib/site-settings'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

/**
 * Metadata is generated rather than static so the title and description come
 * from Sanity — AGENTS.md §2 counts SEO copy as editor-managed.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    title: settings.siteTitle,
    description: settings.siteDescription,
    openGraph: {
      title: settings.siteTitle,
      description: settings.siteDescription,
      type: 'website',
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

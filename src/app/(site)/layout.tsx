import Link from 'next/link'

import { Logo } from '@/components/logo'

import { getSiteSettings } from '@/lib/site-settings'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <>
      <header className="border-primary/40 border-b">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link
            href="/"
            aria-label={`${settings.siteTitle} — home`}
            className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          >
            {/* alt="" — the link is already labelled above, so a filled alt
                would make a screen reader announce the brand twice. */}
            <Logo size="nav" alt="" priority />
          </Link>
          <div className="flex flex-wrap gap-5 text-sm font-bold tracking-wide uppercase">
            {settings.nav.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-primary focus-visible:ring-ring text-foreground/80 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="border-primary/40 text-muted-foreground border-t py-8 text-center text-xs tracking-widest uppercase">
        {settings.footer}
      </footer>
    </>
  )
}

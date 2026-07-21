import Link from 'next/link'

import { siteCopy } from '@/lib/site-copy'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-primary/40 border-b">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link
            href="/"
            className="focus-visible:ring-ring text-xl font-black tracking-tighter uppercase focus-visible:ring-2 focus-visible:outline-none"
          >
            ND<span className="text-primary">Riot</span>
          </Link>
          <div className="flex flex-wrap gap-5 text-sm font-bold tracking-wide uppercase">
            {siteCopy.nav.map(({ label, href }) => (
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
        {siteCopy.footer}
      </footer>
    </>
  )
}

import Link from 'next/link'

import { Logo } from '@/components/logo'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Site chrome.
 *
 * `main` is full width and unpadded on purpose. Every landmark here follows
 * the same two-layer shape the Section component uses — a full-bleed outer
 * element carrying background, border and padding, wrapping a centred inner
 * container that holds the width. That is what lets a section paint edge to
 * edge while its contents stay aligned with everything else.
 *
 * Constraining `main` would undo that: pages would have to opt out of a
 * container to draw a full-bleed background, which is what they were doing
 * with negative margins before.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <>
      <header className="border-primary/40 border-b">
        <nav className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-6 py-4">
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

      <main>{children}</main>

      <footer className="border-primary/40 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-[90rem] flex-col items-center gap-2 px-6 py-8 text-center text-xs tracking-widest uppercase">
          {/* Contact sits here, not in the header, so Join stays the single
              call to action up top and this stays the utility corner. */}
          <Link
            href="/contact"
            className="hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {settings.contact.linkLabel}
          </Link>
          <span>{settings.footer}</span>
        </div>
      </footer>
    </>
  )
}

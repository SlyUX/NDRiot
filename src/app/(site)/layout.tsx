import Link from 'next/link'

import { Logo } from '@/components/logo'
import { MainNav } from '@/components/main-nav'
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
      {/* Sticky + z-50: keeps the nav on screen and, crucially, gives it a
          stacking context above the page so the dropdowns are not painted
          behind content. bg-background so nothing shows through on scroll. The
          mobile drawer (absolute, top-full) anchors to this positioned header. */}
      <header className="border-primary/40 bg-background sticky top-0 z-50 border-b">
        <nav className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 py-4">
          <Link
            href="/"
            aria-label={`${settings.siteTitle} — home`}
            className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          >
            {/* alt="" — the link is already labelled above, so a filled alt
                would make a screen reader announce the brand twice. */}
            <Logo size="nav" alt="" priority />
          </Link>
          <MainNav nav={settings.nav} />
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

import Link from 'next/link'
import { CircleUser, Mail } from 'lucide-react'

import { Logo } from '@/components/logo'
import { MainNav } from '@/components/main-nav'
import { NewsletterForm } from '@/components/newsletter-form'
import { SocialIcon } from '@/components/social-icon'
import { genreOptions } from '@/lib/filters'
import { safeFetch, GENRES_WITH_BOOKS_QUERY } from '@/lib/queries'
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
  const [settings, genresWithBooks] = await Promise.all([
    getSiteSettings(),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
  ])
  const navGenres = genreOptions(genresWithBooks)

  return (
    <>
      {/* Sticky + z-50: keeps the nav on screen and, crucially, gives it a
          stacking context above the page so the dropdowns are not painted
          behind content. bg-background so nothing shows through on scroll. The
          mobile drawer (absolute, top-full) anchors to this positioned header. */}
      <header className="border-primary/40 bg-background sticky top-0 z-50 border-b">
        {/* px-6 on phone/tablet; flush to the edge only on desktop. */}
        <nav className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-6 py-4 lg:px-0">
          <Link
            href="/"
            aria-label={`${settings.siteTitle} — home`}
            className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          >
            {/* alt="" — the link is already labelled above, so a filled alt
                would make a screen reader announce the brand twice. */}
            <Logo size="nav" alt="" priority />
          </Link>
          <div className="flex items-center gap-3 lg:gap-5">
            <MainNav nav={settings.nav} genres={navGenres} />
            {/* Account — links to the reader home; signed-out lands on its
                sign-in prompt, so one control serves both states. */}
            <Link
              href="/me"
              aria-label={settings.sections.accountTitle}
              className="text-foreground/80 hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <CircleUser className="size-5" />
            </Link>
            {settings.discordUrl && (
              <a
                href={settings.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ND Riot Discord"
                className="text-foreground/80 hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <SocialIcon platform="Discord" className="size-5" />
              </a>
            )}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-primary/40 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-[90rem] flex-col items-center gap-3 px-6 py-8 text-center text-xs tracking-widest uppercase">
          {/* Newsletter — a small form; the prominent one is the pink band up top. */}
          <div className="w-full max-w-xs pb-2">
            <p className="text-foreground mb-2 font-bold">{settings.newsletter.heading}</p>
            <NewsletterForm copy={settings.newsletter} variant="compact" className="normal-case tracking-normal" />
          </div>

          {/* Utility corner. Contact is a glyph rather than a text link, matched
              to the Discord mark beside it. Both keep Join the single worded CTA
              up top. */}
          <div className="flex items-center gap-4">
            <Link
              href="/contact"
              aria-label={settings.contact.linkLabel}
              className="hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Mail className="size-5" />
            </Link>
            {settings.discordUrl && (
              <a
                href={settings.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ND Riot Discord"
                className="hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <SocialIcon platform="Discord" className="size-5" />
              </a>
            )}
          </div>

          {/* Follow row — ND Riot's traditional social accounts. Deliberately
              quieter than Discord above: footer-only and a size smaller, since
              Discord is the community hub, not just another feed. */}
          {settings.socialLinks.length > 0 && (
            <ul className="flex items-center gap-1">
              {settings.socialLinks.map((social) => (
                <li key={social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`ND Riot on ${social.platform}`}
                    title={`ND Riot on ${social.platform}`}
                    className="hover:text-primary focus-visible:ring-ring flex size-9 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <SocialIcon platform={social.platform} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/about"
            className="hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            About
          </Link>

          <span>{settings.footer}</span>
        </div>
      </footer>
    </>
  )
}

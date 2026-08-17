import Link from 'next/link'

import { Logo } from '@/components/logo'
import { MainNav } from '@/components/main-nav'
import { SocialIcon } from '@/components/social-icon'
import { auth, signIn } from '@/auth'
import { genreOptions } from '@/lib/filters'
import {
  safeFetch,
  GENRES_WITH_BOOKS_QUERY,
  RESOURCE_CATEGORIES_WITH_CONTENT_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { RESOURCE_CATEGORIES } from '@/lib/taxonomy'

const FOOTER_LINK =
  'hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none'
const SOCIAL_LINK =
  'hover:text-primary focus-visible:ring-ring flex size-9 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none'

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
  const [settings, genresWithBooks, resourceCategories, session] = await Promise.all([
    getSiteSettings(),
    safeFetch<string[]>(GENRES_WITH_BOOKS_QUERY, {}, []),
    safeFetch<string[]>(RESOURCE_CATEGORIES_WITH_CONTENT_QUERY, {}, []),
    auth(),
  ])
  const navGenres = genreOptions(genresWithBooks)
  // Only categories that have content, in taxonomy order — so nav links never
  // point at an empty category.
  const navCategories = RESOURCE_CATEGORIES.filter((category) => resourceCategories.includes(category))
  const avatar = session?.user?.image
  const s = settings.sections

  return (
    <>
      {/* Sticky + z-50: keeps the nav on screen and, crucially, gives it a
          stacking context above the page so the dropdowns are not painted
          behind content. bg-background so nothing shows through on scroll. The
          mobile drawer (absolute, top-full) anchors to this positioned header. */}
      <header className="border-primary/40 bg-background sticky top-0 z-50 border-b">
        {/* px-6 on phone/tablet; flush to the edge only on desktop. */}
        <nav className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-6 py-4 lg:px-0">
          {/* Brand lockup: the logo, and — when signed in — the account avatar
              right beside it, sized to the logo's height so the "you're logged
              in" signal reads as part of the masthead and links to /me. */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label={`${settings.siteTitle} — home`}
              className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            >
              {/* alt="" — the link is already labelled above, so a filled alt
                  would make a screen reader announce the brand twice. */}
              <Logo size="nav" alt="" priority />
            </Link>
            {avatar && (
              <Link
                href="/me"
                aria-label={s.accountTitle}
                className="focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="border-primary/50 size-8 border object-cover sm:size-9"
                />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            <MainNav nav={settings.nav} genres={navGenres} resourceCategories={navCategories} />
            {/* Account, signed out only (the signed-in avatar now sits by the
                logo): Login (starts Google sign-in) | Join (the hub). */}
            {!avatar && (
              <div className="text-foreground/80 flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
                <form
                  action={async () => {
                    'use server'
                    await signIn('google', { redirectTo: '/me' })
                  }}
                >
                  <button
                    type="submit"
                    className="hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {s.navLoginLabel}
                  </button>
                </form>
                <span className="text-foreground/30" aria-hidden="true">
                  |
                </span>
                <Link
                  href="/join"
                  className="hover:text-primary focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {s.navJoinLabel}
                </Link>
              </div>
            )}
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
        <div className="text-muted-foreground mx-auto flex max-w-[90rem] flex-col items-center gap-8 px-6 py-8 text-center text-xs tracking-widest uppercase">
          {/* Footer nav — Get Listed is the intake funnel, moved down here out of
              the header; The Riot gathers About + Contact. */}
          <nav className="flex flex-wrap justify-center gap-x-12 gap-y-6">
            <div>
              <p className="text-foreground mb-2 font-bold">{s.footerGetListedHeading}</p>
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                <li>
                  <Link href="/join/creators" className={FOOTER_LINK}>{s.footerJoinCreatorsLabel}</Link>
                </li>
                <li>
                  <Link href="/join/books" className={FOOTER_LINK}>{s.footerJoinComicsLabel}</Link>
                </li>
                <li>
                  <Link href="/join/media" className={FOOTER_LINK}>{s.footerJoinMediaLabel}</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground mb-2 font-bold">{s.footerRiotHeading}</p>
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                <li>
                  <Link href="/about" className={FOOTER_LINK}>{s.footerAboutLabel}</Link>
                </li>
                <li>
                  <Link href="/contact" className={FOOTER_LINK}>{settings.contact.linkLabel}</Link>
                </li>
                <li>
                  <Link href="/privacy" className={FOOTER_LINK}>{s.footerPrivacyLabel}</Link>
                </li>
              </ul>
            </div>
          </nav>

          {/* Social — one row: Discord (the community hub) plus the follow accounts. */}
          {(settings.discordUrl || settings.socialLinks.length > 0) && (
            <ul className="flex flex-wrap items-center justify-center gap-1">
              {settings.discordUrl && (
                <li>
                  <a
                    href={settings.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="ND Riot Discord"
                    className={SOCIAL_LINK}
                  >
                    <SocialIcon platform="Discord" className="size-4" />
                  </a>
                </li>
              )}
              {settings.socialLinks.map((social) => (
                <li key={social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`ND Riot on ${social.platform}`}
                    title={`ND Riot on ${social.platform}`}
                    className={SOCIAL_LINK}
                  >
                    <SocialIcon platform={social.platform} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* Sign-off: the lockup rendered as a quiet gray mark (grayscale so the
              pink recedes here, unlike the nav), above the tagline. */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Logo size="footer" alt="" className="opacity-75 grayscale" />
            <span>{settings.footer}</span>
          </div>
        </div>
      </footer>
    </>
  )
}

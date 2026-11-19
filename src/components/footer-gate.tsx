'use client'

import { usePathname } from 'next/navigation'

/**
 * Hides the site footer on the signed-in app layer — the /me dashboard (and its
 * ?view= sections: Bunker, Network, Saved, Settings) and the /forum tree. The
 * footer is website/marketing chrome (Get Listed, The Riot, RSS, socials) and
 * doesn't belong on the app surface. Every dashboard section shares the /me
 * pathname; the forum lives under /forum. The footer renders normally elsewhere.
 */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/me' || pathname === '/forum' || pathname.startsWith('/forum/')) return null
  return <>{children}</>
}

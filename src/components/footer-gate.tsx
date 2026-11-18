'use client'

import { usePathname } from 'next/navigation'

/**
 * Hides the site footer on the signed-in dashboard — the "app layer" (/me and
 * its ?view= sections: Bunker, Network, Saved, Settings). The footer is
 * website/marketing chrome (Get Listed, The Riot, RSS, socials) and doesn't
 * belong on the app surface. Every dashboard section shares the /me pathname, so
 * this one check covers them all. The footer renders normally everywhere else.
 */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/me') return null
  return <>{children}</>
}

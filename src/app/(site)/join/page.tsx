import type { Metadata } from 'next'
import Link from 'next/link'

import { Section } from '@/components/ui/section'
import { TheDeal } from '@/components/the-deal'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.join.funnelHeading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

/**
 * The way in — a hub that routes each kind of visitor to the right path.
 *
 * Deliberately not a form: creators, media outlets, and people with a question
 * each go somewhere different, and reader profiles don't exist yet. Keeping the
 * split explicit here means /join/creators and /join/media each stay a single,
 * focused form rather than one page trying to be all of them.
 */
export default async function JoinHubPage() {
  const settings = await getSiteSettings()
  const j = settings.join

  const cards = [
    { label: j.creatorsLabel, desc: j.creatorsDesc, href: '/join/creators' },
    { label: j.mediaLabel, desc: j.mediaDesc, href: '/join/media' },
    { label: j.contactLabel, desc: j.contactDesc, href: '/contact' },
    { label: j.readersLabel, desc: j.readersDesc, href: '/me' },
  ]

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{j.funnelHeading}</h1>
      <p className="text-muted-foreground mt-4 max-w-prose text-sm">{j.funnelIntro}</p>

      {/* The deal, said plainly, before anyone picks a door. */}
      <TheDeal text={j.terms} className="mt-8" />
      <p className="text-muted-foreground mt-4 max-w-prose text-sm italic">{j.termsWhy}</p>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="group border-primary/20 hover:border-primary focus-visible:border-primary focus-visible:ring-primary flex h-full flex-col border p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="group-hover:text-primary text-xl font-black tracking-tighter uppercase transition-colors">
                {c.label}
              </span>
              <span className="text-muted-foreground mt-2 text-sm">{c.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

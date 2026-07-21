import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'

import PortableTextBody from '@/components/PortableTextBody'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    title: `${settings.join.heading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

/**
 * The way in.
 *
 * The homepage makes an argument and then offers two browse links, so a
 * creator persuaded by it had nowhere to go. This is that destination.
 *
 * It is a page rather than a bare link to the form because a form on its own
 * answers none of the questions someone has before filling it in: what this
 * is, who it is for, and what happens next. The reply-time promise in the
 * body is the part that stops people wondering whether it worked.
 */
export default async function JoinPage() {
  const settings = await getSiteSettings()
  const { heading, body, ctaLabel, formUrl } = settings.join

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{heading}</h1>

      {body && (
        <div className="mt-6">
          <PortableTextBody value={body} />
        </div>
      )}

      {/* No button rather than a dead one if the link is ever cleared — a
          button that goes nowhere is worse than an obviously unfinished page. */}
      {formUrl && (
        <div className="mt-8">
          <Button asChild size="lg" className="font-black tracking-wide uppercase">
            <a href={formUrl} target="_blank" rel="noopener noreferrer">
              {ctaLabel}
              {/* Marks the jump off-site. aria-hidden because the visible
                  label already says what the button does. */}
              <ExternalLink aria-hidden="true" className="ml-1 size-4" />
            </a>
          </Button>
        </div>
      )}
    </Section>
  )
}

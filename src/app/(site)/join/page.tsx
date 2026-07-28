import type { Metadata } from 'next'

import { CreatorIntakeForm, type CreatorIntakeOrg } from '@/components/creator-intake-form'
import PortableTextBody from '@/components/PortableTextBody'
import { Section } from '@/components/ui/section'
import { safeFetch, INTAKE_ORGANIZATIONS_QUERY } from '@/lib/queries'
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
 * It leads with the intro copy — what this is, who it is for, what happens
 * next — because a bare form answers none of that. The on-site form writes a
 * review draft straight into Sanity (a human still publishes it). The original
 * Google Form stays available as a fallback link while the native one beds in.
 */
export default async function JoinPage() {
  const [settings, organizations] = await Promise.all([
    getSiteSettings(),
    safeFetch<CreatorIntakeOrg[]>(INTAKE_ORGANIZATIONS_QUERY, {}, []),
  ])
  const { heading, body, ctaLabel, formUrl } = settings.join
  const intake = settings.creatorIntake

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{heading}</h1>

      {body && (
        <div className="mt-6">
          <PortableTextBody value={body} />
        </div>
      )}

      <div className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">{intake.heading}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{intake.intro}</p>
        </div>
        <CreatorIntakeForm copy={intake} organizations={organizations} />
      </div>

      {/* Fallback to the original Google Form while the native form is proven.
          The button label is the only copy here, so nothing is hardcoded. */}
      {formUrl && (
        <p className="border-primary/20 text-muted-foreground mt-14 border-t pt-6 text-xs">
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline underline-offset-4"
          >
            {ctaLabel}
          </a>
        </p>
      )}
    </Section>
  )
}

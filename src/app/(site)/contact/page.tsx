import type { Metadata } from 'next'

import PortableTextBody from '@/components/PortableTextBody'
import { ContactForm } from '@/components/contact-form'
import { Section } from '@/components/ui/section'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    title: `${settings.contact.heading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

/**
 * /contact. Reached from the footer rather than the main nav — Join is the
 * primary call to action, this is the quieter utility route.
 *
 * Messages are emailed, never stored (see the Server Action for why). The
 * anti-spam timing gate lives in the form itself, stamped after hydration, so
 * this stays a pure server component.
 */
export default async function ContactPage() {
  const settings = await getSiteSettings()
  const { heading, body } = settings.contact

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{heading}</h1>

      {body && (
        <div className="mt-6">
          <PortableTextBody value={body} />
        </div>
      )}

      <div className="mt-8">
        <ContactForm copy={settings.contact} />
      </div>
    </Section>
  )
}

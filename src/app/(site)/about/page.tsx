import type { Metadata } from 'next'

import { JsonLd } from '@/components/json-ld'
import PortableTextBody from '@/components/PortableTextBody'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { pageMetadata } from '@/lib/page-metadata'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import {
  aboutPageSchema,
  breadcrumbSchema,
  faqPageSchema,
  jsonLdGraph,
} from '@/lib/structured-data'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return pageMetadata({
    title: settings.about.seoTitle || settings.about.heading,
    description: settings.about.seoDescription,
    path: '/about',
    siteTitle: settings.siteTitle,
  })
}

/**
 * The mission page — and the site's best "citable" asset. The opening prose is
 * the entity definition search and AI engines quote; the FAQ carries FAQPage
 * schema. Both are CMS-managed; a fallback line shows until the body is written.
 */
export default async function AboutPage() {
  const settings = await getSiteSettings()
  const about = settings.about
  const url = absoluteUrl('/about')

  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-8">
      <JsonLd
        data={jsonLdGraph(
          aboutPageSchema({
            name: about.seoTitle || about.heading,
            url,
            description: about.seoDescription,
          }),
          ...(about.faq.length > 0 ? [faqPageSchema(about.faq)] : []),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: about.heading, path: '/about' },
          ]),
        )}
      />

      <header>
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
          {about.heading}
        </h1>
      </header>

      {about.body?.length ? (
        <PortableTextBody value={about.body} />
      ) : (
        <p className="text-muted-foreground max-w-prose">{about.seoDescription}</p>
      )}

      {about.faq.length > 0 && (
        <section className="space-y-5">
          <SectionHeading as="h2" size="md">
            {about.faqHeading}
          </SectionHeading>
          <dl className="space-y-6">
            {about.faq.map((item) => (
              <div key={item.question}>
                <dt className="font-bold">{item.question}</dt>
                <dd className="text-muted-foreground mt-1 max-w-prose text-sm whitespace-pre-line">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </Section>
  )
}

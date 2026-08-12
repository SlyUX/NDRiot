import Link from 'next/link'

import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { RESOURCE_KIND_LABEL } from '@/lib/card-mappers'
import type { ResourceSummary } from '@/lib/types'

/**
 * The Resources section on /resources — a grid of cards, each linking to the
 * resource's own page (/resources/[slug]) where the video/file/link and the
 * write-up live. A dedicated component rather than ContentCard (§4): resources
 * carry a kind label and no cover, where ContentCard is image-first. Ordering +
 * grouping come from the query; this only renders. Strings from Sanity (§2);
 * the kind label is a system classification (like a genre/format badge), code.
 */
export function ResourceList({
  heading,
  headingAs = 'h2',
  headingSize = 'sm',
  resources,
  emptyMessage,
}: {
  heading: string
  /** `h1` when the list *is* the page (/resources); `h2` for a section. */
  headingAs?: 'h1' | 'h2'
  headingSize?: 'sm' | 'md' | 'lg'
  resources: ResourceSummary[]
  emptyMessage: string
}) {
  return (
    <Section padding="md">
      <SectionHeading as={headingAs} size={headingSize}>
        {heading}
      </SectionHeading>

      {resources.length === 0 ? (
        <p className="text-muted-foreground py-8 text-sm">{emptyMessage}</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <li key={resource._id}>
              <Link
                href={`/resources/${resource.slug}`}
                className="group hover:border-primary focus-visible:ring-ring flex h-full flex-col border border-white/15 p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-primary text-[10px] font-bold tracking-widest uppercase">
                  {RESOURCE_KIND_LABEL[resource.kind]} · {resource.category}
                </span>
                <h3 className="mt-2 leading-tight font-bold group-hover:underline">{resource.title}</h3>
                {resource.description && (
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                    {resource.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

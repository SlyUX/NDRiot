import { ArrowUpRight } from 'lucide-react'

import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { externalHref } from '@/lib/utils'
import type { ResourceSummary } from '@/lib/types'

/**
 * The Resources section on /resources — a grid of outbound links.
 *
 * A dedicated presentational component rather than ContentCard (§4): resources
 * carry no cover image and link off-site, where ContentCard is image-first and
 * renders an internal next/Link with no `target`/`rel`. Each block is a real
 * external anchor (new tab, nofollow). Ordering + grouping come from the query;
 * this only renders. Every string is Sanity's (§2).
 */
export function ResourceList({
  heading,
  resources,
  emptyMessage,
}: {
  heading: string
  resources: ResourceSummary[]
  emptyMessage: string
}) {
  return (
    <Section padding="md">
      <SectionHeading as="h2" size="sm">
        {heading}
      </SectionHeading>

      {resources.length === 0 ? (
        <p className="text-muted-foreground py-8 text-sm">{emptyMessage}</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <li key={resource._id}>
              <a
                href={externalHref(resource.url)}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="group hover:border-primary focus-visible:ring-ring flex h-full flex-col border border-white/15 p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-primary text-[10px] font-bold tracking-widest uppercase">
                  {resource.category}
                </span>
                <h3 className="mt-2 flex items-start gap-1 leading-tight font-bold group-hover:underline">
                  <span className="min-w-0">{resource.title}</span>
                  <ArrowUpRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                </h3>
                {resource.description && (
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                    {resource.description}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

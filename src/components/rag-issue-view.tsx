import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Download } from 'lucide-react'

import BookLinks from '@/components/book-links'
import PortableTextBody from '@/components/PortableTextBody'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/card-mappers'
import { urlFor } from '@/sanity/image'
import type { RagIssueDetail } from '@/lib/types'

/**
 * One issue of the Rag, in full — used both as the featured issue on /magazine
 * (headingAs="h2", under the page's own h1) and as the whole /magazine/[slug]
 * page (headingAs="h1"). The PDF reads in the browser or downloads (Sanity's
 * `?dl=` forces the download); other editions ride the shared BookLinks. The
 * table of contents sits in the same column as the editions; contributors — a
 * creator (linked) or a typed name, with their section + role — are a masthead
 * below. All labels are Sanity's (§2); "Issue N" is a structural label (code).
 */
export function RagIssueView({
  issue,
  labels,
  headingAs = 'h2',
}: {
  issue: RagIssueDetail
  labels: {
    read: string
    download: string
    buyHeading: string
    tocHeading: string
    contributorsHeading: string
  }
  headingAs?: 'h1' | 'h2'
}) {
  const date = formatDate(issue.publishedAt)
  // Sub-sections sit one level below the issue title, wherever it lands.
  const subAs = headingAs === 'h1' ? 'h2' : 'h3'

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">
          Issue {issue.issueNumber}
          {date ? ` · ${date}` : ''}
        </p>
        <SectionHeading as={headingAs} size="lg">
          {issue.title}
        </SectionHeading>
        {issue.description && (
          <p className="text-foreground/85 max-w-prose text-base">{issue.description}</p>
        )}
      </header>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="bg-muted relative aspect-[2/3] w-44 shrink-0 overflow-hidden sm:w-56">
          {issue.cover && (
            <Image
              src={urlFor(issue.cover).width(448).url()}
              alt={issue.cover.alt ?? ''}
              fill
              sizes="(max-width: 640px) 176px, 224px"
              className="object-cover"
              priority
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {issue.pdfUrl && (
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="font-black tracking-wide uppercase">
                <a href={issue.pdfUrl} target="_blank" rel="noopener noreferrer">
                  {labels.read}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-black tracking-wide uppercase">
                {/* ?dl= flips Sanity's asset to Content-Disposition: attachment. */}
                <a href={`${issue.pdfUrl}?dl=`}>
                  <Download aria-hidden="true" className="size-4" />
                  {labels.download}
                </a>
              </Button>
            </div>
          )}

          <BookLinks links={issue.buyLinks} heading={labels.buyHeading} framed />

          {/* Table of contents — same column as the editions, beneath them. */}
          {issue.toc?.length ? (
            <div>
              <SectionHeading as={subAs} size="sm">
                {labels.tocHeading}
              </SectionHeading>
              <PortableTextBody value={issue.toc} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Contributors masthead — full width beneath. Each is a creator (linked to
          their profile) or a typed name, with their section and role. */}
      {issue.contributors?.length ? (
        <section>
          <SectionHeading as={subAs} size="sm">
            {labels.contributorsHeading}
          </SectionHeading>
          <ul className="space-y-1 text-sm">
            {issue.contributors.map((c) => {
              const name = c.creatorName ?? c.customName ?? 'Contributor'
              const meta = [c.role, c.section].filter(Boolean).join(' · ')
              return (
                <li key={c._key} className="flex flex-wrap items-baseline gap-x-2">
                  {c.creatorSlug ? (
                    <Link
                      href={`/creators/${c.creatorSlug}`}
                      className="hover:text-primary font-bold underline-offset-2 hover:underline"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="font-bold">{name}</span>
                  )}
                  {meta && <span className="text-muted-foreground">— {meta}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

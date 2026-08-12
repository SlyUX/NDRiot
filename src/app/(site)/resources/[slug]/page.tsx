import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, Download } from 'lucide-react'

import PortableTextBody from '@/components/PortableTextBody'
import { VideoEmbed } from '@/components/video-embed'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { formatDate } from '@/lib/card-mappers'
import { pageMetadata } from '@/lib/page-metadata'
import { safeFetch, RESOURCE_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { externalHref } from '@/lib/utils'
import type { ResourceDetail } from '@/lib/types'
import { urlFor } from '@/sanity/image'

/**
 * A single resource page. `kind` selects the lead — an embedded video, a
 * download button, or a "visit" link — and the Portable Text body (with inline
 * images) is the write-up beneath it. A Guide has no lead; its body is the
 * piece. Reached from /resources; /downloads and /editorial redirect elsewhere.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [resource, settings] = await Promise.all([
    safeFetch<ResourceDetail | null>(RESOURCE_QUERY, { slug }, null),
    getSiteSettings(),
  ])
  if (!resource) return {}
  return pageMetadata({
    title: resource.title,
    description: resource.description ?? undefined,
    path: `/resources/${slug}`,
    siteTitle: settings.siteTitle,
  })
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [resource, settings] = await Promise.all([
    safeFetch<ResourceDetail | null>(RESOURCE_QUERY, { slug }, null),
    getSiteSettings(),
  ])

  if (!resource) notFound()

  const s = settings.sections
  const published = formatDate(resource.publishedAt)
  // Attribution: an ND Riot creator links to their profile; an outside source is
  // plain text. A creator wins if both are somehow set.
  const byline = resource.creatorName
    ? { name: resource.creatorName, href: resource.creatorSlug ? `/creators/${resource.creatorSlug}` : null }
    : resource.source
      ? { name: resource.source, href: null }
      : null

  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-6">
      {/* Lead: the video for a video resource; otherwise the cover image if one
          was given. A Guide with no image simply opens on its title. */}
      {resource.kind === 'video' && resource.videoUrl ? (
        <VideoEmbed url={resource.videoUrl} title={resource.title} />
      ) : (
        resource.image && (
          <div className="bg-muted relative aspect-video overflow-hidden">
            <Image
              src={urlFor(resource.image).width(1200).url()}
              alt={resource.image.alt ?? ''}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )
      )}

      <header className="space-y-2">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">{resource.category}</p>
        <h1 className="text-3xl font-black tracking-tighter uppercase">{resource.title}</h1>
        {(byline || published) && (
          <p className="text-muted-foreground text-xs">
            {byline &&
              (byline.href ? (
                <>
                  by{' '}
                  <Link href={byline.href} className="hover:text-primary underline underline-offset-2">
                    {byline.name}
                  </Link>
                </>
              ) : (
                <>by {byline.name}</>
              ))}
            {byline && published && ' · '}
            {published && resource.publishedAt && (
              <time dateTime={resource.publishedAt}>{published}</time>
            )}
          </p>
        )}
        {resource.description && (
          <p className="text-foreground/85 max-w-prose text-base">{resource.description}</p>
        )}
      </header>

      {/* The action, for the kinds that have one. */}
      {resource.kind === 'download' && resource.fileUrl && (
        <Button asChild size="lg" className="font-black tracking-wide uppercase">
          <a href={resource.fileUrl} download>
            <Download aria-hidden="true" className="size-4" />
            {s.resourceDownloadLabel}
          </a>
        </Button>
      )}
      {resource.kind === 'link' && resource.url && (
        <Button asChild size="lg" className="font-black tracking-wide uppercase">
          <a href={externalHref(resource.url)} target="_blank" rel="nofollow noopener noreferrer">
            {s.resourceVisitLabel}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Button>
      )}

      <PortableTextBody value={resource.body} />
    </Section>
  )
}

import Image from 'next/image'
import { notFound } from 'next/navigation'

import { ContentCard } from '@/components/content-card'
import PortableTextBody from '@/components/PortableTextBody'
import { SectionHeading } from '@/components/section-heading'
import { ShareBar } from '@/components/share-bar'
import { Section } from '@/components/ui/section'
import { creatorRefToCard, formatDate } from '@/lib/card-mappers'
import { safeFetch, COLUMN_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { absoluteUrl } from '@/lib/site-url'
import type { ColumnDetail } from '@/lib/types'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [column, settings] = await Promise.all([
    safeFetch<ColumnDetail | null>(COLUMN_QUERY, { slug }, null),
    getSiteSettings(),
  ])

  if (!column) notFound()

  const published = formatDate(column.publishedAt)
  const authorCard = creatorRefToCard(column.author)

  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-6">
      {/* Header image, when the piece has one — 16:9 to match the card thumbnail
          it shares. Decorative here: the title sits right below it. */}
      {column.cover && (
        <div className="bg-muted relative aspect-video overflow-hidden">
          <Image
            src={urlFor(column.cover).width(1200).url()}
            alt={column.cover.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      )}

      <header>
        <h1 className="text-3xl font-black tracking-tighter uppercase">{column.title}</h1>
        {column.authorName && (
          <p className="text-primary text-xs tracking-wide uppercase">by {column.authorName}</p>
        )}
        {published && column.publishedAt && (
          <time dateTime={column.publishedAt} className="text-muted-foreground text-xs">
            {published}
          </time>
        )}
      </header>

      <PortableTextBody value={column.body} />

      {/* The author, credited as a card at the foot — every author is a creator,
          so this reuses the same framed card the book page gives its creator. */}
      {authorCard && (
        <div>
          <SectionHeading as="h3" size="sm">
            {settings.sections.editorialAuthorHeading}
          </SectionHeading>
          <div className="border-border border p-[15px]">
            <ContentCard {...authorCard} layout="horizontal" summaryLines={4} />
          </div>
        </div>
      )}

      <ShareBar
        title={column.title}
        url={absoluteUrl(`/editorial/columns/${slug}`)}
        label={settings.sections.shareLabel}
        copiedLabel={settings.sections.linkCopiedLabel}
        className="border-primary/20 border-t pt-6"
      />
    </Section>
  )
}

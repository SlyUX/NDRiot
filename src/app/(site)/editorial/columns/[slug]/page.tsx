import { notFound } from 'next/navigation'

import { Section } from '@/components/ui/section'

import PortableTextBody from '@/components/PortableTextBody'
import { formatDate } from '@/lib/card-mappers'
import { safeFetch, COLUMN_QUERY } from '@/lib/queries'
import type { ColumnDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const column = await safeFetch<ColumnDetail | null>(COLUMN_QUERY, { slug }, null)

  if (!column) notFound()

  const published = formatDate(column.publishedAt)

  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-6">
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
    </Section>
  )
}

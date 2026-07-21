import { ContentCardGrid } from '@/components/content-card-grid'
import { creatorToCard } from '@/lib/card-mappers'
import { safeFetch, CREATORS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { CreatorSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CreatorsPage() {
  const [creators, settings] = await Promise.all([
    safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <ContentCardGrid
      heading={settings.sections.creatorsHeading}
      headingAs="h1"
      headingSize="lg"
      cards={creators.map(creatorToCard)}
      columns={4}
      emptyMessage={settings.empty.creators}
    />
  )
}

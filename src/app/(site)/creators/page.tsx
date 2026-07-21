import { ContentCardGrid } from '@/components/content-card-grid'
import { creatorToCard } from '@/lib/card-mappers'
import { safeFetch, CREATORS_QUERY } from '@/lib/queries'
import { siteCopy } from '@/lib/site-copy'
import type { CreatorSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CreatorsPage() {
  const creators = await safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, [])

  return (
    <ContentCardGrid
      heading={siteCopy.home.creatorsHeading}
      headingAs="h1"
      headingSize="lg"
      cards={creators.map(creatorToCard)}
      columns={4}
      padding="none"
      maxWidth="full"
      emptyMessage={siteCopy.empty.creators}
    />
  )
}

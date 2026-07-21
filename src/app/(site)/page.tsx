import { ContentCardGrid } from '@/components/content-card-grid'
import { Hero } from '@/components/hero'
import { GenreBadge } from '@/components/genre-badge'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import { safeFetch, FEATURES_QUERY, GENRES_QUERY, BOOKS_QUERY, CREATORS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary, CreatorSummary, FeatureItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [features, genres, books, creators, settings] = await Promise.all([
    safeFetch<FeatureItem[]>(FEATURES_QUERY, {}, []),
    safeFetch<string[]>(GENRES_QUERY, {}, []),
    safeFetch<BookSummary[]>(BOOKS_QUERY, {}, []),
    safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <div>
      {/* Featured items are carousel slides now — a separate Featured grid
          below would show the same three things twice. */}
      <Hero hero={settings.hero} features={features} />

      {genres.length > 0 && (
        <Section padding="md">
          <SectionHeading size="sm">{settings.home.genresHeading}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <GenreBadge key={genre} genre={genre} variant="outline" size="md" />
            ))}
          </div>
        </Section>
      )}

      <ContentCardGrid
        heading={settings.home.booksHeading}
        cards={books.slice(0, 8).map(bookToCard)}
        columns={4}
        padding="md"
        viewAllHref="/books"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={settings.empty.books}
      />

      <ContentCardGrid
        heading={settings.home.creatorsHeading}
        cards={creators.slice(0, 8).map(creatorToCard)}
        columns={4}
        padding="md"
        viewAllHref="/creators"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={settings.empty.creators}
      />
    </div>
  )
}

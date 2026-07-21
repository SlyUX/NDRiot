import { ContentCardGrid } from '@/components/content-card-grid'
import { GenreBadge } from '@/components/genre-badge'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { bookToCard, creatorToCard, featureToCard } from '@/lib/card-mappers'
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
      <Section as="header" padding="none" maxWidth="full" className="border-b pb-10">
        <h1 className="text-4xl leading-none font-black tracking-tighter uppercase sm:text-6xl">
          {settings.home.headlineLead}
          <br />
          <span className="text-primary">{settings.home.headlineAccent}</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl">{settings.home.intro}</p>
      </Section>

      {features.length > 0 && (
        <ContentCardGrid
          heading={settings.home.featuredHeading}
          headingSize="sm"
          cards={features.filter(Boolean).map(featureToCard)}
          layout="overlay"
          aspectRatio="portrait"
          columns={3}
          padding="md"
          maxWidth="full"
          emptyMessage={settings.empty.features}
        />
      )}

      {genres.length > 0 && (
        <Section padding="md" maxWidth="full">
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
        maxWidth="full"
        viewAllHref="/books"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={settings.empty.books}
      />

      <ContentCardGrid
        heading={settings.home.creatorsHeading}
        cards={creators.slice(0, 8).map(creatorToCard)}
        columns={4}
        padding="md"
        maxWidth="full"
        viewAllHref="/creators"
        viewAllLabel={settings.home.viewAllLabel}
        emptyMessage={settings.empty.creators}
      />
    </div>
  )
}

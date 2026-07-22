import { ContentCardGrid } from '@/components/content-card-grid'
import { Hero } from '@/components/hero'
import { GenreBadge } from '@/components/genre-badge'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import {
  safeFetch,
  BOOK_IDS_QUERY,
  HERO_BOOKS_QUERY,
  GENRES_QUERY,
  BOOKS_QUERY,
  CREATORS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { BookSummary, CreatorSummary, HeroBook } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Hero slides after the pitch. Three is what the carousel was built around. */
const HERO_SLOTS = 3

/**
 * Picks the books the hero will show.
 *
 * Random per request, not curated. Every book gets the same odds of the
 * homepage, which is the point: a directory that hand-picks its front page is
 * ranking its contributors, and this one deliberately does not.
 *
 * Two queries because GROQ has no random(). Fetching identifiers and then only
 * the chosen few keeps the cost flat as the roster grows — fetching every book
 * in full to shuffle three of them would not.
 */
async function pickHeroBooks(): Promise<HeroBook[]> {
  const ids = await safeFetch<string[]>(BOOK_IDS_QUERY, {}, [])
  if (ids.length === 0) return []

  // Fisher-Yates over a copy. Partial is fine — we only need the front.
  const pool = [...ids]
  const take = Math.min(HERO_SLOTS, pool.length)
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const chosen = pool.slice(0, take)
  const books = await safeFetch<HeroBook[]>(HERO_BOOKS_QUERY, { ids: chosen }, [])

  // `in $ids` does not preserve the order we asked for, so re-apply it —
  // otherwise the shuffle is undone by the query and the same book leads
  // every time.
  const order = new Map(chosen.map((id, i) => [id, i]))
  return books.sort((a, b) => (order.get(a._id) ?? 0) - (order.get(b._id) ?? 0))
}

export default async function Home() {
  const [heroBooks, genres, books, creators, settings] = await Promise.all([
    pickHeroBooks(),
    safeFetch<string[]>(GENRES_QUERY, {}, []),
    safeFetch<BookSummary[]>(BOOKS_QUERY, {}, []),
    safeFetch<CreatorSummary[]>(CREATORS_QUERY, {}, []),
    getSiteSettings(),
  ])

  return (
    <div>
      <Hero hero={settings.hero} books={heroBooks} />

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

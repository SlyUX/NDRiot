import type { Metadata } from 'next'
import Link from 'next/link'

import { SignInButton, SignOutButton } from '@/components/auth-controls'
import { ContentCard } from '@/components/content-card'
import { ContentCardGrid } from '@/components/content-card-grid'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { auth } from '@/auth'
import { bookToCard, creatorToCard, mediaToCard } from '@/lib/card-mappers'
import {
  safeFetch,
  OWNED_BOOKS_QUERY,
  OWNED_DOCS_QUERY,
  OWNED_MEDIA_QUERY,
  SAVED_BOOKS_QUERY,
  SAVED_CREATORS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { ownedDocIds } from '@/sanity/ownership-client'
import { savedItems } from '@/sanity/reader-client'
import type { BookSummary, CreatorSummary, MediaSummary } from '@/lib/types'

/**
 * The signed-in reader's home.
 *
 * Their own explicit collections only — saved comics and makers — plus, if they
 * own any listings, a way back into managing them. Nothing here is inferred,
 * ranked, or recommended (AGENTS.md §3); it is a shelf, not a feed. Private and
 * per-person, so it is never indexed.
 */
export const dynamic = 'force-dynamic'

/** Owned creators/media, resolved for the manage links (local shape, like the join pages). */
type OwnedDoc = { _id: string; _type: string; name: string | null; slug: string | null }

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.sections.accountTitle} · ${settings.siteTitle}`,
    robots: { index: false, follow: false },
  }
}

export default async function AccountPage() {
  const [settings, session] = await Promise.all([getSiteSettings(), auth()])
  const s = settings.sections
  const email = session?.user?.email

  // Signed out: a plain invitation, not a wall.
  if (!email) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-3xl font-black tracking-tighter uppercase">{s.accountSignInTitle}</h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm">{s.accountSignInBody}</p>
        <div className="mt-6">
          <SignInButton label={s.accountSignInCta} redirectTo="/me" />
        </div>
      </Section>
    )
  }

  const saves = await savedItems(email)
  const bookIds = saves.filter((x) => x.itemType === 'book').map((x) => x.itemId)
  const creatorIds = saves.filter((x) => x.itemType === 'creator').map((x) => x.itemId)

  // Owned docs resolve to their type first, so comics can be looked up by the
  // creator ids they belong to and media by their own ids.
  const ownedIds = await ownedDocIds(email)
  const ownedDocs = ownedIds.length
    ? await safeFetch<OwnedDoc[]>(OWNED_DOCS_QUERY, { ids: ownedIds }, [])
    : []
  const ownedCreatorIds = ownedDocs.filter((d) => d._type === 'creator').map((d) => d._id)
  const ownedMediaIds = ownedDocs.filter((d) => d._type === 'media').map((d) => d._id)

  const [savedBooks, savedCreators, ownedCreators, ownedBooks, ownedMedia] = await Promise.all([
    bookIds.length
      ? safeFetch<BookSummary[]>(SAVED_BOOKS_QUERY, { ids: bookIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    creatorIds.length
      ? safeFetch<CreatorSummary[]>(SAVED_CREATORS_QUERY, { ids: creatorIds }, [])
      : Promise.resolve<CreatorSummary[]>([]),
    ownedCreatorIds.length
      ? safeFetch<CreatorSummary[]>(SAVED_CREATORS_QUERY, { ids: ownedCreatorIds }, [])
      : Promise.resolve<CreatorSummary[]>([]),
    ownedCreatorIds.length
      ? safeFetch<BookSummary[]>(OWNED_BOOKS_QUERY, { ids: ownedCreatorIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    ownedMediaIds.length
      ? safeFetch<MediaSummary[]>(OWNED_MEDIA_QUERY, { ids: ownedMediaIds }, [])
      : Promise.resolve<MediaSummary[]>([]),
  ])

  const hasSaves = savedBooks.length > 0 || savedCreators.length > 0
  const editLabel = s.accountEditLabel

  return (
    <div>
      <Section padding="md" className="pb-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">{s.accountTitle}</h1>
          <SignOutButton label={settings.creatorIntake.signOutLabel} redirectTo="/" />
        </div>
        {session.user?.name && <p className="text-muted-foreground mt-2 text-sm">{session.user.name}</p>}
      </Section>

      {hasSaves ? (
        <>
          {savedBooks.length > 0 && (
            <ContentCardGrid
              heading={s.booksHeading}
              cards={savedBooks.map(bookToCard)}
              columns={5}
              padding="md"
              emptyMessage=""
            />
          )}
          {savedCreators.length > 0 && (
            <ContentCardGrid
              heading={s.creatorsHeading}
              cards={savedCreators.map(creatorToCard)}
              layout="horizontal"
              columns={4}
              summaryLines={4}
              padding="md"
              background="charcoal"
              emptyMessage=""
            />
          )}
        </>
      ) : (
        // An empty shelf is a discovery moment, not a dead end (§3).
        <Section padding="md" maxWidth="3xl">
          <p className="text-muted-foreground text-sm">{settings.empty.saved}</p>
          <Link
            href="/books"
            className="text-primary hover:text-primary focus-visible:ring-ring mt-4 inline-block text-sm font-black tracking-widest uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {settings.home.viewAllLabel} →
          </Link>
        </Section>
      )}

      {/* Your Creator Profile — the profile shown, with a way into its form.
          A top divider sets this owner area apart on the near-black surface. */}
      {ownedCreators.length > 0 && (
        <Section padding="md" className="border-primary/25 border-t">
          <SectionHeading as="h2" size="sm">
            {s.accountCreatorHeading}
          </SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {ownedCreators.map((creator) => (
              <div key={creator._id} className="space-y-2">
                <ContentCard {...creatorToCard(creator)} layout="horizontal" summaryLines={3} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/join/creators?editing=${encodeURIComponent(creator._id)}`}>
                    {editLabel}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Your Comics — each with its own edit route. */}
      {ownedBooks.length > 0 && (
        <Section padding="md">
          <SectionHeading as="h2" size="sm">
            {s.accountComicsHeading}
          </SectionHeading>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {ownedBooks.map((book) => (
              <div key={book._id} className="space-y-2">
                <ContentCard {...bookToCard(book)} />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/join/books?editing=${encodeURIComponent(book._id)}`}>{editLabel}</Link>
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Your Media — same treatment for owned outlets. */}
      {ownedMedia.length > 0 && (
        <Section padding="md">
          <SectionHeading as="h2" size="sm">
            {s.accountMediaHeading}
          </SectionHeading>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ownedMedia.map((outlet) => (
              <div key={outlet._id} className="space-y-2">
                <ContentCard {...mediaToCard(outlet)} />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/join/media?editing=${encodeURIComponent(outlet._id)}`}>{editLabel}</Link>
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { SignInButton, SignOutButton } from '@/components/auth-controls'
import { ContentCard } from '@/components/content-card'
import { ContentCardGrid } from '@/components/content-card-grid'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { auth } from '@/auth'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
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
import { urlFor } from '@/sanity/image'
import type { BookSummary, CreatorSummary, MediaSummary } from '@/lib/types'

/**
 * The signed-in reader's home.
 *
 * Top: who they are — user details, plus their creator profile if they own one.
 * Then the things they manage (comics, media) as compact rows with edit/view
 * links, then their saved shelf. Nothing is inferred, ranked, or recommended
 * (AGENTS.md §3). Private and per-person, so it is never indexed.
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

  const isCreator = ownedCreators.length > 0
  const hasSaves = savedBooks.length > 0 || savedCreators.length > 0
  const editLabel = s.accountEditLabel

  return (
    <div>
      {/* Profile — charcoal band with the user's details and, for a creator,
          their profile card moved in here (heading reflects which they are). */}
      <Section padding="md" background="charcoal">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">
              {isCreator ? s.accountUserCreatorHeading : s.accountUserHeading}
            </h1>
            {session.user?.name && <p className="text-foreground mt-2 font-bold">{session.user.name}</p>}
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
          <SignOutButton label={settings.creatorIntake.signOutLabel} redirectTo="/" />
        </div>

        {isCreator && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {ownedCreators.map((creator) => (
              <div key={creator._id} className="space-y-2">
                <ContentCard {...creatorToCard(creator)} layout="horizontal" summaryLines={3} />
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/join/creators?editing=${encodeURIComponent(creator._id)}`}>
                      {editLabel}
                    </Link>
                  </Button>
                  {creator.slug && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/creators/${creator.slug}`}>{s.accountViewCreatorLabel}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Your Comics — compact feed-style rows, each with edit + view links. */}
      {ownedBooks.length > 0 && (
        <Section padding="md">
          <SectionHeading as="h2" size="sm">
            {s.accountComicsHeading}
          </SectionHeading>
          <ul className="border-border divide-border divide-y border-y">
            {ownedBooks.map((book) => {
              const view = book.slug ? `/books/${book.slug}` : null
              return (
                <li key={book._id} className="flex items-center gap-3 py-3">
                  <div className="bg-muted relative aspect-[2/3] w-9 shrink-0 overflow-hidden">
                    {book.cover && (
                      <Image
                        src={urlFor(book.cover).width(72).url()}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  {view ? (
                    <Link
                      href={view}
                      className="hover:text-primary min-w-0 flex-1 truncate text-sm font-bold transition-colors"
                    >
                      {book.title}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{book.title}</span>
                  )}
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/join/books?editing=${encodeURIComponent(book._id)}`}>{editLabel}</Link>
                    </Button>
                    {view && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={view}>{s.accountViewBookLabel}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {/* Your Media — same feed-style rows for owned outlets. */}
      {ownedMedia.length > 0 && (
        <Section padding="md" background="charcoal">
          <SectionHeading as="h2" size="sm">
            {s.accountMediaHeading}
          </SectionHeading>
          <ul className="border-border divide-border divide-y border-y">
            {ownedMedia.map((outlet) => {
              const view = outlet.slug ? `/media/${outlet.slug}` : null
              return (
                <li key={outlet._id} className="flex items-center gap-3 py-3">
                  <div className="bg-background relative aspect-square w-9 shrink-0 overflow-hidden">
                    {outlet.logo && (
                      <Image
                        src={urlFor(outlet.logo).width(72).url()}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-contain"
                      />
                    )}
                  </div>
                  {view ? (
                    <Link
                      href={view}
                      className="hover:text-primary min-w-0 flex-1 truncate text-sm font-bold transition-colors"
                    >
                      {outlet.name}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{outlet.name}</span>
                  )}
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/join/media?editing=${encodeURIComponent(outlet._id)}`}>{editLabel}</Link>
                    </Button>
                    {view && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={view}>{s.accountViewMediaLabel}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {/* Saved — the reader's shelf. */}
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
    </div>
  )
}

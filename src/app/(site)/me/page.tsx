import type { Metadata } from 'next'
import Link from 'next/link'

import { SignInButton, SignOutButton } from '@/components/auth-controls'
import { ContentCardGrid } from '@/components/content-card-grid'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { auth } from '@/auth'
import { bookToCard, creatorToCard } from '@/lib/card-mappers'
import { safeFetch, OWNED_DOCS_QUERY, SAVED_BOOKS_QUERY, SAVED_CREATORS_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import { ownedDocIds } from '@/sanity/ownership-client'
import { savedItems } from '@/sanity/reader-client'
import type { BookSummary, CreatorSummary } from '@/lib/types'

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
  const ownedIds = await ownedDocIds(email)

  const [savedBooks, savedCreators, owned] = await Promise.all([
    bookIds.length
      ? safeFetch<BookSummary[]>(SAVED_BOOKS_QUERY, { ids: bookIds }, [])
      : Promise.resolve<BookSummary[]>([]),
    creatorIds.length
      ? safeFetch<CreatorSummary[]>(SAVED_CREATORS_QUERY, { ids: creatorIds }, [])
      : Promise.resolve<CreatorSummary[]>([]),
    ownedIds.length
      ? safeFetch<OwnedDoc[]>(OWNED_DOCS_QUERY, { ids: ownedIds }, [])
      : Promise.resolve<OwnedDoc[]>([]),
  ])

  const hasSaves = savedBooks.length > 0 || savedCreators.length > 0

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

      {owned.length > 0 && (
        <Section padding="md" background="charcoal">
          <SectionHeading as="h2" size="sm">
            {s.accountListingsHeading}
          </SectionHeading>
          <ul className="flex flex-col gap-2">
            {owned.map((doc) => {
              const base = doc._type === 'media' ? '/join/media' : '/join/creators'
              return (
                <li key={doc._id}>
                  <Link
                    href={`${base}?editing=${encodeURIComponent(doc._id)}`}
                    className="focus-visible:ring-ring hover:text-primary text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {doc.name ?? doc._id} →
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}

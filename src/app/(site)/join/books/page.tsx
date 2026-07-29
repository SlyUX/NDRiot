import type { Metadata } from 'next'
import Link from 'next/link'

import { auth } from '@/auth'
import { SignInButton, SignOutButton } from '@/components/auth-controls'
import {
  BookIntakeForm,
  type BookIntakeInitial,
  type BookPickerItem,
  type OwnedCreator,
} from '@/components/book-intake-form'
import { Section } from '@/components/ui/section'
import {
  safeFetch,
  INTAKE_OWNED_CREATORS_QUERY,
  INTAKE_OWNED_BOOKS_QUERY,
  INTAKE_BOOK_EDIT_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'
import { editableDraftPreferred } from '@/sanity/intake-reads'
import { creatorsOwnedBy } from '@/sanity/ownership-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.bookIntake.heading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

/** Raw editable shape from INTAKE_BOOK_EDIT_QUERY. */
type EditBook = {
  _id: string
  title: string | null
  slug: string | null
  creatorId: string | null
  genres: string[] | null
  format: string | null
  maturity: string | null
  status: string | null
  issueCount: number | null
  shortDescription: string | null
  descriptionText: string | null
  cover: SanityImage | null
  coverAlt: string | null
  previewUrl: string | null
  links: { kind: string | null; label: string | null; url: string | null; endDate: string | null }[] | null
}

function toInitial(b: EditBook): BookIntakeInitial {
  return {
    updateId: b._id,
    title: b.title ?? '',
    slug: b.slug ?? '',
    creatorId: b.creatorId ?? null,
    genres: b.genres ?? [],
    format: b.format ?? '',
    maturity: b.maturity ?? '',
    status: b.status ?? '',
    issueCount: b.issueCount != null ? String(b.issueCount) : '',
    shortDescription: b.shortDescription ?? '',
    description: b.descriptionText ?? '',
    cover: b.cover ?? null,
    coverAlt: b.coverAlt ?? '',
    previewUrl: b.previewUrl ?? '',
    links: (b.links ?? []).map((l) => ({
      kind: l.kind ?? '',
      label: l.label ?? '',
      url: l.url ?? '',
      endDate: l.endDate ?? '',
    })),
  }
}

/**
 * Add or manage your comics.
 *
 * Gated like /join: signed out shows the sign-in prompt; signed in, a book is
 * scoped to the creators you own. The creator dropdown lists only your
 * creators, and the picker only your books. Owning no creator is a dead end for
 * a book, so that case points back to the creator form.
 */
export default async function BooksIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ editing?: string | string[]; new?: string | string[] }>
}) {
  const params = await searchParams
  const editingId = Array.isArray(params.editing) ? params.editing[0] : params.editing

  const [settings, session] = await Promise.all([getSiteSettings(), auth()])
  const copy = settings.bookIntake
  const common = settings.creatorIntake
  const email = session?.user?.email ?? null

  // Signed out.
  if (!email) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{copy.heading}</h1>
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-black tracking-tighter uppercase">{copy.signInPrompt}</h2>
          <p className="text-muted-foreground max-w-prose text-sm">{copy.signInBody}</p>
          <SignInButton label={common.signInButton} redirectTo="/join/books" />
        </div>
      </Section>
    )
  }

  const ownedIds = await creatorsOwnedBy(email)

  // Signed in but owns no creator — a book needs one first.
  if (ownedIds.length === 0) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{copy.heading}</h1>
        <p className="text-muted-foreground mt-6 max-w-prose text-sm">{copy.creatorHint}</p>
        <div className="mt-6">
          <Link
            href="/join/creators"
            className="text-primary text-sm font-semibold tracking-widest uppercase underline underline-offset-4"
          >
            {settings.creatorIntake.heading}
          </Link>
        </div>
      </Section>
    )
  }

  const [creators, books] = await Promise.all([
    safeFetch<OwnedCreator[]>(INTAKE_OWNED_CREATORS_QUERY, { ids: ownedIds }, []),
    safeFetch<BookPickerItem[]>(INTAKE_OWNED_BOOKS_QUERY, { ids: ownedIds }, []),
  ])

  // Editing is allowed only for a book among your own (INTAKE_OWNED_BOOKS_QUERY
  // is already creator-scoped); the action re-checks regardless.
  const ownedBookIds = new Set(books.map((b) => b._id))
  const canEdit = Boolean(editingId && ownedBookIds.has(editingId))
  // Prefer the draft so pending (unreviewed) edits prepopulate.
  const editBook = canEdit
    ? await editableDraftPreferred<EditBook>(INTAKE_BOOK_EDIT_QUERY, editingId!)
    : null
  const initial = editBook ? toInitial(editBook) : undefined

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{copy.heading}</h1>

      <div className="border-primary/20 mt-8 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-xs">
        <span className="text-muted-foreground tracking-widest uppercase">
          {common.signedInLabel} <span className="text-foreground">{email}</span>
        </span>
        <SignOutButton label={common.signOutLabel} redirectTo="/join/books" />
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            {initial ? copy.editHeading : copy.heading}
          </h2>
          {!initial && <p className="text-muted-foreground mt-2 text-sm">{copy.intro}</p>}
        </div>
        <BookIntakeForm
          key={initial?.updateId ?? 'new'}
          copy={copy}
          common={common}
          creators={creators}
          books={books}
          initial={initial}
        />
      </div>
    </Section>
  )
}

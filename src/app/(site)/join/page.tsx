import type { Metadata } from 'next'

import {
  CreatorIntakeForm,
  type CreatorIntakeInitial,
  type CreatorIntakeOrg,
} from '@/components/creator-intake-form'
import PortableTextBody from '@/components/PortableTextBody'
import { Section } from '@/components/ui/section'
import {
  safeFetch,
  INTAKE_CREATORS_QUERY,
  INTAKE_CREATOR_EDIT_QUERY,
  INTAKE_ORGANIZATIONS_QUERY,
} from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    title: `${settings.join.heading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

/** The raw editable shape from INTAKE_CREATOR_EDIT_QUERY. */
type EditProfile = {
  _id: string
  name: string | null
  slug: string | null
  location: string | null
  website: string | null
  bioText: string | null
  socials: { platform: string | null; url: string | null }[] | null
  works: { label: string | null; url: string | null }[] | null
  genres: string[] | null
  formats: string[] | null
  openToCollaboration: boolean | null
  photo: SanityImage | null
  photoAlt: string | null
  studioId: string | null
  orgIds: string[] | null
}

/** Turn a fetched profile into the flat, form-shaped `initial` values. */
function toInitial(p: EditProfile): CreatorIntakeInitial {
  return {
    updateId: p._id,
    name: p.name ?? '',
    slug: p.slug ?? '',
    location: p.location ?? '',
    website: p.website ?? '',
    bio: p.bioText ?? '',
    socials: (p.socials ?? []).map((s) => ({ platform: s.platform ?? '', url: s.url ?? '' })),
    works: (p.works ?? []).map((w) => ({ label: w.label ?? '', url: w.url ?? '' })),
    genres: p.genres ?? [],
    formats: p.formats ?? [],
    collab: p.openToCollaboration ?? false,
    photo: p.photo ?? null,
    photoAlt: p.photoAlt ?? '',
    studioId: p.studioId ?? null,
    orgIds: p.orgIds ?? [],
  }
}

/**
 * The way in.
 *
 * Leads with the intro copy — what this is, who it is for, what happens next —
 * because a bare form answers none of that. The on-site form writes a review
 * draft straight into Sanity (a human still publishes it). A creator already
 * listed can pick their profile to update it; the form then prepopulates from
 * their live values. The original Google Form stays as a fallback link.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ editing?: string | string[] }>
}) {
  const params = await searchParams
  const editingId = Array.isArray(params.editing) ? params.editing[0] : params.editing

  const [settings, organizations, creators, editProfile] = await Promise.all([
    getSiteSettings(),
    safeFetch<CreatorIntakeOrg[]>(INTAKE_ORGANIZATIONS_QUERY, {}, []),
    safeFetch<CreatorIntakeOrg[]>(INTAKE_CREATORS_QUERY, {}, []),
    editingId
      ? safeFetch<EditProfile | null>(INTAKE_CREATOR_EDIT_QUERY, { id: editingId }, null)
      : Promise.resolve(null),
  ])

  const { heading, body, ctaLabel, formUrl } = settings.join
  const intake = settings.creatorIntake
  const initial = editProfile ? toInitial(editProfile) : undefined

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{heading}</h1>

      {body && (
        <div className="mt-6">
          <PortableTextBody value={body} />
        </div>
      )}

      <div className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">{intake.heading}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{intake.intro}</p>
        </div>
        {/* Keyed so switching profiles (or back to new) remounts the form and
            its uncontrolled defaults pick up the new values. */}
        <CreatorIntakeForm
          key={initial?.updateId ?? 'new'}
          copy={intake}
          organizations={organizations}
          creators={creators}
          initial={initial}
        />
      </div>

      {/* Fallback to the original Google Form while the native form is proven.
          The button label is the only copy here, so nothing is hardcoded. */}
      {formUrl && (
        <p className="border-primary/20 text-muted-foreground mt-14 border-t pt-6 text-xs">
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline underline-offset-4"
          >
            {ctaLabel}
          </a>
        </p>
      )}
    </Section>
  )
}

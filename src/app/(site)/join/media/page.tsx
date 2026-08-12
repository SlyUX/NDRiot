import type { Metadata } from 'next'

import { auth } from '@/auth'
import { SignInButton, SignOutButton } from '@/components/auth-controls'
import {
  MediaIntakeForm,
  type MediaIntakeInitial,
  type MediaPickerItem,
} from '@/components/media-intake-form'
import { Section } from '@/components/ui/section'
import { safeFetch, INTAKE_OWNED_MEDIA_QUERY, INTAKE_MEDIA_EDIT_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { SanityImage } from '@/lib/types'
import { editableDraftPreferred } from '@/sanity/intake-reads'
import { ownedDocIds } from '@/sanity/ownership-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.mediaIntake.heading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  }
}

type EditMedia = {
  _id: string
  name: string | null
  slug: string | null
  kinds: string[] | null
  aboutText: string | null
  genresCovered: string[] | null
  pitchInfo: string | null
  logo: SanityImage | null
  logoAlt: string | null
  links: { label: string | null; url: string | null }[] | null
  feedUrl: string | null
  feedConsent: boolean | null
}

function toInitial(m: EditMedia): MediaIntakeInitial {
  return {
    updateId: m._id,
    name: m.name ?? '',
    slug: m.slug ?? '',
    kinds: m.kinds ?? [],
    about: m.aboutText ?? '',
    genresCovered: m.genresCovered ?? [],
    pitchInfo: m.pitchInfo ?? '',
    logo: m.logo ?? null,
    logoAlt: m.logoAlt ?? '',
    links: (m.links ?? []).map((l) => ({ label: l.label ?? '', url: l.url ?? '' })),
    feedUrl: m.feedUrl ?? '',
    feedConsent: m.feedConsent ?? false,
  }
}

/**
 * List or manage a media outlet. Gated like the other intake forms: signed out
 * shows the sign-in prompt; signed in, a media outlet self-registers and owns
 * its own listing (the picker lists only what you own; the action re-checks).
 * Not exposed in the nav — reached from /join and by direct link.
 */
export default async function MediaIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ editing?: string | string[] }>
}) {
  const params = await searchParams
  const editingId = Array.isArray(params.editing) ? params.editing[0] : params.editing

  const [settings, session] = await Promise.all([getSiteSettings(), auth()])
  const copy = settings.mediaIntake
  const common = settings.creatorIntake
  const email = session?.user?.email ?? null

  if (!email) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">{copy.heading}</h1>
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-black tracking-tighter uppercase">{copy.signInPrompt}</h2>
          <p className="text-muted-foreground max-w-prose text-sm">{copy.signInBody}</p>
          <SignInButton label={common.signInButton} redirectTo="/join/media" />
        </div>
      </Section>
    )
  }

  const ownedIds = await ownedDocIds(email)
  const media = ownedIds.length
    ? await safeFetch<MediaPickerItem[]>(INTAKE_OWNED_MEDIA_QUERY, { ids: ownedIds }, [])
    : []

  const ownedMediaIds = new Set(media.map((m) => m._id))
  const canEdit = Boolean(editingId && ownedMediaIds.has(editingId))
  const editMedia = canEdit
    ? await editableDraftPreferred<EditMedia>(INTAKE_MEDIA_EDIT_QUERY, editingId!)
    : null
  const initial = editMedia ? toInitial(editMedia) : undefined

  return (
    <Section padding="md" maxWidth="3xl">
      {/* The h1 carries the verb (Add vs Update) — no separate heading repeating it. */}
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
        {initial ? copy.editHeading : copy.heading}
      </h1>

      <div className="border-primary/20 mt-8 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-xs">
        <span className="text-muted-foreground tracking-widest uppercase">
          {common.signedInLabel} <span className="text-foreground">{email}</span>
        </span>
        <SignOutButton label={common.signOutLabel} redirectTo="/join/media" />
      </div>

      <div className="mt-8 space-y-6">
        {!initial && <p className="text-muted-foreground text-sm">{copy.intro}</p>}
        <MediaIntakeForm
          key={initial?.updateId ?? 'new'}
          copy={copy}
          common={common}
          media={media}
          initial={initial}
        />
      </div>
    </Section>
  )
}

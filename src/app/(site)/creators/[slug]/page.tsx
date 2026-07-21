import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentCardGrid } from '@/components/content-card-grid'
import { OrganizationLink } from '@/components/organization-link'
import PortableTextBody from '@/components/PortableTextBody'
import SocialLinks from '@/components/SocialLinks'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { safeFetch, CREATOR_QUERY } from '@/lib/queries'
import { getSiteSettings } from '@/lib/site-settings'
import type { CreatorDetail } from '@/lib/types'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [creator, settings] = await Promise.all([
    safeFetch<CreatorDetail | null>(CREATOR_QUERY, { slug }, null),
    getSiteSettings(),
  ])

  // Real 404 rather than a 200 that says "not found" — search engines and
  // monitoring both read the status code, not the copy.
  if (!creator) notFound()

  /**
   * Whether the studio's logo is literally the creator's portrait.
   *
   * Sanity asset IDs are content-addressed — `image-<sha1>-<dims>-<format>` —
   * so the same file uploaded twice produces the same ID. Comparing refs is
   * an identity check, not a guess.
   *
   * Read through optional chaining, never compared against `undefined`:
   * GROQ returns `null` for an absent field, so `logo !== undefined` is true
   * when there is no logo and the next property access throws. That mistake
   * took this page down once already.
   *
   * It misses a re-exported or resized copy, which hashes differently, and
   * the dimensions and format sit in the ID too, so the same picture saved as
   * PNG and JPG will not match. That is the acceptable miss: the common case
   * is one solo creator using one file for both, and the failure mode is
   * merely showing a logo we could have suppressed.
   */
  const portraitRef = creator.photo?.asset?._ref
  const studioLogoRef = creator.studio?.logo?.asset?._ref
  const studioLogoIsPortrait = Boolean(portraitRef) && portraitRef === studioLogoRef

  return (
    <div>
      <Section as="header" padding="md">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          {creator.photo && (
            <div className="relative h-40 w-40 shrink-0 overflow-hidden">
              <Image
                src={urlFor(creator.photo).width(320).height(320).url()}
                alt={creator.photo.alt ?? `Portrait of ${creator.name}`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">{creator.name}</h1>
            {creator.studio && (
              <div className="mt-1">
                {/* The studio sits immediately under the creator's portrait.
                    Fall back to text only when the logo IS that portrait —
                    otherwise the same image appears twice within a few pixels
                    and reads as a duplication bug. A multi-member studio with
                    a distinct mark still gets its logo. */}
                <OrganizationLink
                  organization={creator.studio}
                  size="md"
                  display={studioLogoIsPortrait ? 'text' : 'auto'}
                />
              </div>
            )}
            {creator.location && <p className="text-muted-foreground">{creator.location}</p>}
            <div className="mt-3">
              <SocialLinks socials={creator.socials} />
            </div>
            {creator.website && (
              <a
                href={creator.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                {creator.website}
              </a>
            )}
          </div>
        </div>
      </Section>

      {creator.bio && (
        <Section padding="md">
          <PortableTextBody value={creator.bio} />
        </Section>
      )}

      {!!creator.books?.length && (
        <ContentCardGrid
          heading={settings.sections.creatorBooksHeading}
          headingSize="sm"
          cards={creator.books.map(bookToCard)}
          columns={4}
          padding="md"
          emptyMessage={settings.empty.books}
        />
      )}

      {!!creator.organizations?.length && (
        <Section padding="md">
          <SectionHeading size="sm">{settings.sections.creatorOrganizationsHeading}</SectionHeading>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-4">
            {creator.organizations.map((org) => (
              <li key={org._id}>
                <OrganizationLink organization={org} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!!creator.favoriteCreators?.length && (
        <Section padding="md">
          <SectionHeading size="sm">{settings.sections.creatorFavoritesHeading}</SectionHeading>
          <ul className="flex flex-wrap gap-3 text-sm">
            {creator.favoriteCreators.map((favorite, index) => (
              <li key={favorite.onSiteSlug ?? favorite.url ?? `${favorite.name}-${index}`}>
                {favorite.onSiteSlug ? (
                  <Link
                    href={`/creators/${favorite.onSiteSlug}`}
                    className="text-primary hover:underline"
                  >
                    {favorite.onSiteName}
                  </Link>
                ) : favorite.url ? (
                  <a
                    href={favorite.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {favorite.name}
                  </a>
                ) : (
                  <span>{favorite.name}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

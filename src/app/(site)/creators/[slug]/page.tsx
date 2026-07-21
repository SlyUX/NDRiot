import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentCardGrid } from '@/components/content-card-grid'
import PortableTextBody from '@/components/PortableTextBody'
import SocialLinks from '@/components/SocialLinks'
import { SectionHeading } from '@/components/section-heading'
import { Section } from '@/components/ui/section'
import { bookToCard } from '@/lib/card-mappers'
import { safeFetch, CREATOR_QUERY } from '@/lib/queries'
import { siteCopy } from '@/lib/site-copy'
import type { CreatorDetail } from '@/lib/types'
import { urlFor } from '@/sanity/image'

export const dynamic = 'force-dynamic'

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const creator = await safeFetch<CreatorDetail | null>(CREATOR_QUERY, { slug }, null)

  // Real 404 rather than a 200 that says "not found" — search engines and
  // monitoring both read the status code, not the copy.
  if (!creator) notFound()

  return (
    <div>
      <Section as="header" padding="none" maxWidth="full">
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
              <p className="text-sm tracking-wide uppercase">
                {creator.studio.website ? (
                  <a
                    href={creator.studio.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {creator.studio.name}
                  </a>
                ) : (
                  <span className="text-primary">{creator.studio.name}</span>
                )}
              </p>
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
        <Section padding="md" maxWidth="full">
          <PortableTextBody value={creator.bio} />
        </Section>
      )}

      {!!creator.books?.length && (
        <ContentCardGrid
          heading={siteCopy.creator.booksHeading}
          headingSize="sm"
          cards={creator.books.map(bookToCard)}
          columns={4}
          padding="md"
          maxWidth="full"
          emptyMessage={siteCopy.empty.books}
        />
      )}

      {!!creator.organizations?.length && (
        <Section padding="md" maxWidth="full">
          <SectionHeading size="sm">{siteCopy.creator.organizationsHeading}</SectionHeading>
          <ul className="flex flex-wrap gap-3 text-sm">
            {creator.organizations.map((org) => (
              <li key={org._id}>
                {org.website ? (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {org.name}
                  </a>
                ) : (
                  <span>{org.name}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!!creator.favoriteCreators?.length && (
        <Section padding="md" maxWidth="full">
          <SectionHeading size="sm">{siteCopy.creator.favoritesHeading}</SectionHeading>
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

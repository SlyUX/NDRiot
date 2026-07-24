import Image from 'next/image'
import { notFound } from 'next/navigation'

import { ContentCardGrid } from '@/components/content-card-grid'
import { OrganizationLink } from '@/components/organization-link'
import PortableTextBody from '@/components/PortableTextBody'
import SocialLinks from '@/components/SocialLinks'
import { SectionHeading } from '@/components/section-heading'
import { GenreBadge } from '@/components/genre-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { bookToCard, favoriteToCard } from '@/lib/card-mappers'
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

  // Favorites are shown as horizontal creator cards. All on-site in practice;
  // any without a profile or link are dropped.
  const favoriteCards = (creator.favoriteCreators ?? [])
    .map(favoriteToCard)
    .filter((card): card is NonNullable<typeof card> => card !== null)

  return (
    <div>
      {/* pb-4, not the full md bottom padding: the bio sits close beneath. */}
      <Section as="header" padding="md" className="pb-4">
        {/* items-start so the portrait's top aligns with the creator name,
            rather than its bottom aligning with the last line of info. */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
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
                {/* Studio shown as text, not its logo: sitting directly beneath
                    the portrait, a logo competes with the photo above it. */}
                <OrganizationLink organization={creator.studio} size="md" display="text" />
              </div>
            )}
            {creator.location && <p className="text-muted-foreground">{creator.location}</p>}

            {/* Genres link out to the category page, which lists creators as
                well as books — so the badge goes somewhere useful rather than
                being decoration. Formats and audience do not have pages, so
                they stay unlinked. */}
            {(creator.genres?.length || creator.formats?.length || creator.audience) && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {creator.genres?.map((genre) => (
                  <GenreBadge key={genre} genre={genre} size="md" />
                ))}
                {creator.formats?.map((format) => (
                  <Badge
                    key={format}
                    variant="outline"
                    className="text-muted-foreground px-2.5 py-0.5 text-[10px] tracking-wider uppercase"
                  >
                    {format}
                  </Badge>
                ))}
                {creator.audience && (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground px-2.5 py-0.5 text-[10px] tracking-wider uppercase"
                  >
                    {creator.audience}
                  </Badge>
                )}
              </div>
            )}

            {/* Only for an explicit yes. `false` and "never answered" both mean
                no badge — claiming someone is available when they have not said
                so is worse than staying quiet. */}
            {creator.openToCollaboration && (
              <Badge
                variant="outline"
                className="border-primary/60 text-primary mt-3 px-2.5 py-0.5 text-[10px] tracking-widest uppercase"
              >
                {settings.sections.openToCollaborationLabel}
              </Badge>
            )}
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
        // pt-2: tight to the header row above, per design.
        <Section padding="md" className="pt-2">
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

      {/* External works — books the creator listed with a link, not (yet)
          entered as full documents. The Books section above carries the rich,
          in-directory ones; this is the "everything else, and where to get it"
          list. */}
      {!!creator.works?.length && (
        <Section padding="md">
          <SectionHeading size="sm">{settings.sections.creatorWorksHeading}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {creator.works.map((work) => (
              <Button key={work.url} asChild variant="outline" size="sm">
                <a href={work.url} target="_blank" rel="noopener noreferrer">
                  {work.label}
                </a>
              </Button>
            ))}
          </div>
        </Section>
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

      {favoriteCards.length > 0 && (
        <ContentCardGrid
          heading={settings.sections.creatorFavoritesHeading}
          headingSize="sm"
          cards={favoriteCards}
          layout="horizontal"
          columns={3}
          summaryLines={4}
          padding="md"
          emptyMessage=""
        />
      )}
    </div>
  )
}

import type { Metadata } from "next";

import { AlternatingSections } from "@/components/alternating-sections";
import { ContentCardGrid } from "@/components/content-card-grid";
import { HubIntro } from "@/components/hub-intro";
import { JsonLd } from "@/components/json-ld";
import { LoadMore } from "@/components/load-more";
import { Section } from "@/components/ui/section";
import { bookToCard, creatorToCard } from "@/lib/card-mappers";
import { PAGE_SIZE, pageLimit, type SearchParams } from "@/lib/filters";
import {
  hubFallbackDescription,
  hubFallbackIntro,
  hubTitle,
} from "@/lib/hub-copy";
import { pageMetadata } from "@/lib/page-metadata";
import {
  safeFetch,
  GENRE_BOOKS_QUERY,
  GENRE_CREATORS_QUERY,
  HUB_PAGE_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import {
  breadcrumbSchema,
  collectionPageSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import type {
  BookSummary,
  CreatorSummary,
  HubCopy,
  Paginated,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const value = decodeURIComponent(genre);
  const [hub, settings] = await Promise.all([
    safeFetch<HubCopy>(HUB_PAGE_QUERY, { kind: "genre", value }, null),
    getSiteSettings(),
  ]);
  return pageMetadata({
    title: hub?.seoTitle?.trim() || hubTitle("genre", value),
    description: hub?.seoDescription?.trim() || hubFallbackDescription(value),
    path: `/categories/${encodeURIComponent(value)}`,
    siteTitle: settings.siteTitle,
  });
}

/**
 * A genre, from both directions: the comics in it and the people who work in
 * it.
 *
 * Creators carry their own genres rather than inheriting them from their
 * books, so someone can be findable before a single book is listed — which is
 * most of the roster early on. It also makes the genre badge on a creator
 * profile lead somewhere, instead of being a label that does nothing.
 *
 * The list is neutral and alphabetical (AGENTS.md §3); the intro + schema make
 * it a real doorway for search and AI engines without ranking anyone.
 */
export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ genre: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { genre } = await params;
  const sp = await searchParams;
  const decoded = decodeURIComponent(genre);
  const bookLimit = pageLimit(sp, "blimit");
  const creatorLimit = pageLimit(sp, "climit");

  const [bookResult, creatorResult, hub, settings] = await Promise.all([
    safeFetch<Paginated<BookSummary>>(
      GENRE_BOOKS_QUERY,
      { genre: decoded, limit: bookLimit },
      { items: [], total: 0 },
    ),
    safeFetch<Paginated<CreatorSummary>>(
      GENRE_CREATORS_QUERY,
      { genre: decoded, limit: creatorLimit },
      { items: [], total: 0 },
    ),
    safeFetch<HubCopy>(HUB_PAGE_QUERY, { kind: "genre", value: decoded }, null),
    getSiteSettings(),
  ]);
  const books = bookResult.items;
  const creators = creatorResult.items;

  const url = absoluteUrl(`/categories/${encodeURIComponent(decoded)}`);

  return (
    <div>
      <JsonLd
        data={jsonLdGraph(
          collectionPageSchema({
            name: hub?.seoTitle?.trim() || hubTitle("genre", decoded),
            url,
            description: hub?.seoDescription ?? hubFallbackDescription(decoded),
            items: books
              .filter((b) => b.slug)
              .map((b) => ({
                name: b.title,
                url: absoluteUrl(`/comics/${b.slug}`),
              })),
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Comics", path: "/comics" },
            {
              name: decoded,
              path: `/categories/${encodeURIComponent(decoded)}`,
            },
          ]),
        )}
      />

      <AlternatingSections>
        <Section as="header" padding="md">
          <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
            {decoded}
          </h1>
          <HubIntro intro={hub?.intro} fallback={hubFallbackIntro(decoded)} />
        </Section>

        <ContentCardGrid
          heading={settings.sections.genreBooksHeading}
          headingSize="sm"
          cards={books.map(bookToCard)}
          columns={5}
          padding="md"
          footer={
            <LoadMore
              searchParams={sp}
              param="blimit"
              shown={books.length}
              total={bookResult.total}
              pageSize={PAGE_SIZE}
            />
          }
          emptyMessage={settings.empty.genreBooks}
        />

        <ContentCardGrid
          heading={settings.sections.genreCreatorsHeading}
          headingSize="sm"
          cards={creators.map(creatorToCard)}
          layout="horizontal"
          columns={4}
          summaryLines={4}
          padding="md"
          footer={
            <LoadMore
              searchParams={sp}
              param="climit"
              shown={creators.length}
              total={creatorResult.total}
              pageSize={PAGE_SIZE}
            />
          }
          emptyMessage={settings.empty.genreCreators}
        />
      </AlternatingSections>
    </div>
  );
}

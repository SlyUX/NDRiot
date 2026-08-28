import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StripGallery } from "@/components/strip-gallery";
import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/page-metadata";
import { safeFetch, SERIES_QUERY } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import type { SeriesDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [series, settings] = await Promise.all([
    safeFetch<SeriesDetail | null>(SERIES_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!series) return {};
  return pageMetadata({
    title: series.creator?.name
      ? `${series.title} — ${series.creator.name}`
      : series.title,
    description:
      series.description ??
      `A series of single-page comics${series.creator?.name ? ` by ${series.creator.name}` : ""} on ND Riot.`,
    path: `/series/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [series, settings] = await Promise.all([
    safeFetch<SeriesDetail | null>(SERIES_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!series) notFound();

  return (
    <div>
      <Section as="header" padding="md" className="pb-6">
        {/* Credit leads — a series is one creator's body of work. */}
        {series.creator?.slug && series.creator.name && (
          <Link
            href={`/creators/${series.creator.slug}`}
            className="text-primary text-xs font-bold tracking-widest uppercase hover:underline"
          >
            {series.creator.name}
          </Link>
        )}
        <h1 className="mt-1 text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {series.title}
        </h1>
        {series.description && (
          <p className="text-muted-foreground mt-3 max-w-prose text-sm">
            {series.description}
          </p>
        )}
      </Section>

      <StripGallery
        strips={series.strips}
        partOfLabel={settings.sections.seriesPartOfLabel}
        columns={5}
        padding="md"
        gridClassName="pt-6"
        emptyMessage={settings.empty.strips}
      />
    </div>
  );
}

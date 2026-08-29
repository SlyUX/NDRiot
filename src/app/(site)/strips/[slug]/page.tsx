import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StripView, type StripNeighbor } from "@/components/strip-view";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import { safeFetch, STRIP_QUERY } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import type { StripDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [strip, settings] = await Promise.all([
    safeFetch<StripDetail | null>(STRIP_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!strip) return {};
  return pageMetadata({
    title: strip.creator?.name
      ? `${strip.title} — ${strip.creator.name}`
      : strip.title,
    description: `A single-page comic${strip.creator?.name ? ` by ${strip.creator.name}` : ""} on ND Riot.`,
    path: `/strips/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function StripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [strip, settings] = await Promise.all([
    safeFetch<StripDetail | null>(STRIP_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!strip) notFound();

  const toNeighbor = (
    n: { slug: string | null; title: string } | null,
  ): StripNeighbor | null => (n?.slug ? { slug: n.slug, title: n.title } : null);

  return (
    <Section padding="md" maxWidth="wide">
      <StripView
        headingLevel="h1"
        strip={{
          title: strip.title,
          image: strip.image,
          width: strip.dimensions?.width ?? null,
          height: strip.dimensions?.height ?? null,
          caption: strip.caption,
          maturity: strip.maturity,
          genres: strip.genres,
          creatorName: strip.creator?.name ?? null,
          creatorSlug: strip.creator?.slug ?? null,
          seriesTitle: strip.series?.title ?? null,
          seriesSlug: strip.series?.slug ?? null,
        }}
        date={formatDate(strip.publishedAt) ?? null}
        partOfLabel={settings.sections.seriesPartOfLabel}
        prev={toNeighbor(strip.prevInSeries)}
        next={toNeighbor(strip.nextInSeries)}
      />
    </Section>
  );
}

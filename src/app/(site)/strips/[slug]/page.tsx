import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GenreBadge } from "@/components/genre-badge";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import { safeFetch, STRIP_QUERY } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import type { Genre } from "@/lib/types";
import type { StripDetail } from "@/lib/types";
import { urlFor } from "@/sanity/image";

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
  const strip = await safeFetch<StripDetail | null>(STRIP_QUERY, { slug }, null);
  if (!strip) notFound();

  const dims = strip.dimensions;
  const date = formatDate(strip.publishedAt);

  return (
    <Section padding="md" maxWidth="4xl">
      {/* Credit leads — a strip is someone's work, so the maker comes first. */}
      {strip.creator?.slug && strip.creator.name && (
        <Link
          href={`/creators/${strip.creator.slug}`}
          className="text-primary text-xs font-bold tracking-widest uppercase hover:underline"
        >
          {strip.creator.name}
        </Link>
      )}
      <h1 className="mt-1 text-3xl font-black tracking-tighter uppercase md:text-4xl">
        {strip.title}
      </h1>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {date && <span>{date}</span>}
        {strip.maturity && (
          <Badge
            variant="outline"
            className="border-primary/60 text-primary px-2 py-0.5 text-[10px] tracking-widest uppercase"
          >
            {strip.maturity}
          </Badge>
        )}
      </div>

      {/* The strip itself — shown at its natural aspect, whatever shape it is. */}
      <div className="bg-muted mt-6">
        <Image
          src={urlFor(strip.image).width(1600).url()}
          alt={strip.image?.alt ?? strip.title}
          width={dims?.width ?? 1600}
          height={dims?.height ?? 2400}
          sizes="(max-width: 56rem) 100vw, 56rem"
          className="h-auto w-full"
          priority
        />
      </div>

      {strip.genres && strip.genres.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {strip.genres.map((g) => (
            <GenreBadge key={g} genre={g as Genre} size="md" />
          ))}
        </div>
      )}
    </Section>
  );
}

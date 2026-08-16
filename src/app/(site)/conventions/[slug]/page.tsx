import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConventionTablers } from "@/components/convention-tablers";
import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/page-metadata";
import {
  safeFetch,
  CONVENTION_QUERY,
  CONVENTION_TABLERS_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { externalHref } from "@/lib/utils";
import { formatPlace } from "@/lib/place";
import type { ConventionDetail, ConventionTabler } from "@/lib/types";
import { urlFor } from "@/sanity/image";

/**
 * A single convention page — what it is, where and roughly when it happens, and
 * a link out to the official site. Creator ratings will land here in a later
 * phase; for now it's the venue's home in the directory.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [convention, settings] = await Promise.all([
    safeFetch<ConventionDetail | null>(CONVENTION_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!convention) return {};
  return pageMetadata({
    title: convention.name,
    description: convention.description ?? undefined,
    path: `/conventions/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function ConventionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [convention, settings] = await Promise.all([
    safeFetch<ConventionDetail | null>(CONVENTION_QUERY, { slug }, null),
    getSiteSettings(),
  ]);

  if (!convention) notFound();

  // Creators tabling at the upcoming occurrence — neutral order, filtered to
  // active by the component (§3).
  const tablers = await safeFetch<ConventionTabler[]>(
    CONVENTION_TABLERS_QUERY,
    { conId: convention._id },
    [],
  );

  // Location and timing, joined for the meta line under the title.
  const meta = [formatPlace(convention.place), convention.whenHint]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section
      as="article"
      padding="md"
      maxWidth="3xl"
      innerClassName="space-y-6"
    >
      {convention.image && (
        <div className="bg-muted relative aspect-video overflow-hidden">
          <Image
            src={urlFor(convention.image).width(1200).url()}
            alt={convention.image.alt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
            priority
          />
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">
          {convention.name}
        </h1>
        {meta && (
          <p className="text-primary text-xs font-bold tracking-widest uppercase">
            {meta}
          </p>
        )}
        {convention.description && (
          <p className="text-foreground/85 max-w-prose text-base">
            {convention.description}
          </p>
        )}
      </header>

      {convention.website && (
        <Button
          asChild
          size="lg"
          className="font-black tracking-wide uppercase"
        >
          <a
            href={externalHref(convention.website)}
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            {settings.sections.conventionVisitLabel}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Button>
      )}

      <ConventionTablers
        tablers={tablers}
        heading={settings.sections.conventionTablersHeading}
        tableLabel={settings.sections.tableLabel}
      />
    </Section>
  );
}

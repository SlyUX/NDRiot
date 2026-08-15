import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AlternatingSections } from "@/components/alternating-sections";
import { ContentCardGrid } from "@/components/content-card-grid";
import { Section } from "@/components/ui/section";
import {
  conventionToCard,
  mediaToCard,
  resourceToCard,
} from "@/lib/card-mappers";
import type { SearchParams } from "@/lib/filters";
import {
  RESOURCE_CATEGORY_DESCRIPTIONS,
  type ResourceCategory,
} from "@/lib/taxonomy";
import { pageMetadata } from "@/lib/page-metadata";
import {
  safeFetch,
  CONVENTIONS_QUERY,
  MEDIA_QUERY,
  RESOURCES_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import type {
  ConventionSummary,
  MediaSummary,
  ResourceSummary,
} from "@/lib/types";

/**
 * Resources — help for indie creators and readers, organized as a hub of rows:
 * one per resource category (grouped by subject, since people browse by what
 * they need, not by format — the kind stays a badge on each card), plus the
 * neighboring directories, Conventions and Media Outlets, as their own rows.
 * Each row links to more of that section. Replaces the old /editorial listing;
 * /editorial and /downloads redirect here.
 *
 * `?category=` narrows to a single category's full grid — the destination each
 * category row's "more" link points to.
 */
export const dynamic = "force-dynamic";

/** How many cards a row shows before "more" takes over. */
const ROW_CAP = 12;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return pageMetadata({
    title: settings.sections.resourcesPageTitle,
    description: settings.sections.resourcesPageDescription,
    path: "/resources",
    siteTitle: settings.siteTitle,
  });
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [resources, conventions, media, settings] = await Promise.all([
    safeFetch<ResourceSummary[]>(RESOURCES_QUERY, {}, []),
    safeFetch<ConventionSummary[]>(CONVENTIONS_QUERY, {}, []),
    safeFetch<MediaSummary[]>(MEDIA_QUERY, {}, []),
    getSiteSettings(),
  ]);
  const s = settings.sections;

  // Group resources by category, preserving the query's alphabetical order.
  const byCategory = new Map<string, ResourceSummary[]>();
  for (const resource of resources) {
    if (!resource.category) continue;
    const bucket = byCategory.get(resource.category) ?? [];
    bucket.push(resource);
    byCategory.set(resource.category, bucket);
  }

  const rawCategory = params.category;
  const requested = (
    Array.isArray(rawCategory) ? rawCategory[0] : rawCategory
  )?.trim();
  const activeCategory =
    requested && byCategory.has(requested) ? requested : null;

  // Single-category view — where a row's "more" lands: that category in full.
  if (activeCategory) {
    return (
      <>
        <Section padding="md" className="pb-0">
          <Link
            href="/resources"
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {s.resourcesPageTitle}
          </Link>
        </Section>
        <ContentCardGrid
          headingAs="h1"
          headingSize="lg"
          heading={activeCategory}
          subtitle={
            RESOURCE_CATEGORY_DESCRIPTIONS[activeCategory as ResourceCategory]
          }
          cards={(byCategory.get(activeCategory) ?? []).map(resourceToCard)}
          layout="vertical"
          columns={3}
          aspectRatio="landscape"
          summaryLines={3}
          padding="md"
          emptyMessage={settings.empty.resources}
        />
      </>
    );
  }

  // Hub: a row per category, then the neighboring directories. Only sections
  // with content appear; each is capped, with "more" linking to the full set.
  const rows = [
    ...Array.from(byCategory, ([category, items]) => ({
      key: category,
      heading: category,
      subtitle: RESOURCE_CATEGORY_DESCRIPTIONS[category as ResourceCategory],
      cards: items.slice(0, ROW_CAP).map(resourceToCard),
      aspectRatio: "landscape" as const,
      href: `/resources?category=${encodeURIComponent(category)}`,
    })),
    ...(conventions.length
      ? [
          {
            key: "conventions",
            heading: s.conventionsPageTitle,
            subtitle: s.conventionsRowSubtitle,
            cards: conventions.slice(0, ROW_CAP).map(conventionToCard),
            aspectRatio: "square" as const,
            href: "/conventions",
          },
        ]
      : []),
    ...(media.length
      ? [
          {
            key: "media",
            heading: settings.home.mediaHeading,
            subtitle: s.mediaRowSubtitle,
            cards: media.slice(0, ROW_CAP).map(mediaToCard),
            aspectRatio: "square" as const,
            href: "/media",
          },
        ]
      : []),
  ];

  return (
    // The header and every row share the alternating --background / --surface-alt
    // rhythm (§9), same as home — AlternatingSections injects each one's band.
    <AlternatingSections>
      <Section as="header" padding="md" className="pb-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl">
          {s.resourcesPageTitle}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm">
          {s.resourcesPageDescription}
        </p>
      </Section>

      {rows.length === 0 ? (
        <Section padding="md">
          <p className="text-muted-foreground text-sm">
            {settings.empty.resources}
          </p>
        </Section>
      ) : (
        rows.map((row) => (
          <ContentCardGrid
            key={row.key}
            heading={row.heading}
            headingAs="h2"
            subtitle={row.subtitle}
            cards={row.cards}
            layout="horizontal"
            columns={4}
            aspectRatio={row.aspectRatio}
            summaryLines={3}
            scroll
            padding="md"
            viewAllHref={row.href}
            viewAllLabel={s.resourcesMoreLabel}
            emptyMessage=""
          />
        ))
      )}
    </AlternatingSections>
  );
}

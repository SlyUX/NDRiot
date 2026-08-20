import type { Metadata } from "next";

import { ContentCardGrid } from "@/components/content-card-grid";
import { allyToCard } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import { safeFetch, ALLIES_QUERY } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import type { AllySummary } from "@/lib/types";

/**
 * Allies — vetted external partners/services ND Riot vouches for on creators'
 * behalf. Curated in Studio (being listed IS the endorsement). Alphabetical
 * (neutral order, §3 — never ranked). Each card links to the ally's detail page,
 * which frames what they do and sends people to their site.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return pageMetadata({
    title: settings.sections.alliesPageTitle,
    description: settings.sections.alliesPageDescription,
    path: "/allies",
    siteTitle: settings.siteTitle,
  });
}

export default async function AlliesPage() {
  const [allies, settings] = await Promise.all([
    safeFetch<AllySummary[]>(ALLIES_QUERY, {}, []),
    getSiteSettings(),
  ]);

  return (
    <ContentCardGrid
      headingAs="h1"
      headingSize="lg"
      heading={settings.sections.alliesPageTitle}
      subtitle={settings.sections.alliesPageDescription}
      cards={allies.map(allyToCard)}
      layout="horizontal"
      columns={3}
      summaryLines={3}
      padding="md"
      emptyMessage={settings.empty.allies}
    />
  );
}

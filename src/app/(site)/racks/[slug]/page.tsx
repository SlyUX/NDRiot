import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import { getSiteSettings } from "@/lib/site-settings";
import { money, rackStockLine, storeTitle } from "@/lib/spinner";
import { getPublicRack } from "@/sanity/spinner-public-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [rack, settings] = await Promise.all([
    getPublicRack(slug),
    getSiteSettings(),
  ]);
  if (!rack) return {};
  return pageMetadata({
    title: storeTitle(rack),
    description: settings.sections.rackPageIntro,
    path: `/racks/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

/**
 * A store's public spinner-rack shelf: the ND Riot comics currently on that
 * rack, each linking to its page, with exact stock + as-of count date. Reads a
 * narrow projection of the private store doc (no financials). Active stores
 * only — an ended rack 404s. Neutral order (by creator then title, §3).
 */
export default async function RackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [rack, settings] = await Promise.all([
    getPublicRack(slug),
    getSiteSettings(),
  ]);
  if (!rack) notFound();

  const placed = formatDate(rack.startDate);
  const meta = [
    rack.address?.trim() || null,
    placed ? `On the rack since ${placed}` : null,
  ].filter(Boolean);

  return (
    <Section padding="lg">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">
          {storeTitle(rack)}
        </h1>
        <p className="text-muted-foreground max-w-prose">
          {settings.sections.rackPageIntro}
        </p>
        {meta.length > 0 && (
          <p className="text-muted-foreground text-sm whitespace-pre-line">
            {meta.join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-10">
        <SectionHeading as="h2" size="sm">
          {settings.sections.rackShelfHeading}
        </SectionHeading>
        {rack.items.length === 0 ? (
          <p className="text-muted-foreground mt-4">
            Nothing on this rack right now.
          </p>
        ) : (
          <ul className="divide-border border-border mt-4 divide-y border-y">
            {rack.items.map((item, i) => {
              const href = item.bookSlug
                ? `${item.kind === "rag" ? "/magazine/" : "/comics/"}${item.bookSlug}`
                : null;
              const row = (
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0">
                    <span className="group-hover:text-primary font-bold tracking-tight">
                      {item.bookTitle}
                    </span>
                    {item.kind !== "rag" && item.creatorName && (
                      <span className="text-muted-foreground"> · {item.creatorName}</span>
                    )}
                    {item.kind === "rag" && (
                      <span className="text-muted-foreground"> · ND Riot Rag</span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {item.price != null ? `${money(item.price)} · ` : ""}
                    {rackStockLine(
                      item.lastCount,
                      item.lastCountDate,
                      settings.sections,
                    )}
                  </span>
                </div>
              );
              return (
                <li key={item.bookSlug ?? i}>
                  {href ? (
                    <Link href={href} className="group block">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}

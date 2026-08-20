import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/page-metadata";
import { externalHref } from "@/lib/utils";
import { safeFetch, ALLY_QUERY } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { urlFor } from "@/sanity/image";
import type { AllyDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [ally, settings] = await Promise.all([
    safeFetch<AllyDetail | null>(ALLY_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!ally) return {};
  return pageMetadata({
    title: ally.name,
    description: ally.offering ?? settings.siteDescription,
    path: `/allies/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function AllyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ally, settings] = await Promise.all([
    safeFetch<AllyDetail | null>(ALLY_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!ally) notFound();

  const visit = settings.sections.allyVisitLabel.replace("{name}", ally.name);

  return (
    <Section padding="md" maxWidth="3xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {ally.logo && (
          <div className="bg-muted relative aspect-square w-40 shrink-0 overflow-hidden">
            <Image
              src={urlFor(ally.logo).width(320).url()}
              alt={ally.logo.alt ?? `${ally.name} logo`}
              fill
              sizes="160px"
              className="object-contain"
            />
          </div>
        )}
        <div className="min-w-0">
          {ally.offering && (
            <p className="text-primary text-xs tracking-widest uppercase">
              {ally.offering}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-black tracking-tighter uppercase md:text-4xl">
            {ally.name}
          </h1>
          {ally.about && (
            <p className="text-muted-foreground mt-5 max-w-prose text-sm whitespace-pre-line">
              {ally.about}
            </p>
          )}
          <a
            href={externalHref(ally.url)}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="bg-primary text-primary-foreground focus-visible:ring-ring mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
          >
            {visit}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </Section>
  );
}

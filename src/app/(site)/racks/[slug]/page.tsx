import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { SpinnerShelf, type ShelfEntry } from "@/components/spinner-shelf";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import {
  RAG_ISSUES_BY_IDS_QUERY,
  SAVED_BOOKS_QUERY,
  safeFetch,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { money, rackStockLine, storeTitle } from "@/lib/spinner";
import { GATED_TIER, MATURITY_TIER_LABELS, type MaturityTier } from "@/lib/taxonomy";
import type { BookSummary, SanityImage } from "@/lib/types";
import { urlFor } from "@/sanity/image";
import { getPublicRack } from "@/sanity/spinner-public-client";

export const dynamic = "force-dynamic";

/** Rag issues enriched by id — just what a shelf cover needs. */
interface ShelfRag {
  _id: string;
  title: string | null;
  slug: string | null;
  cover: SanityImage | null;
  descriptionText: string | null;
}

const coverUrlFor = (cover: SanityImage | null | undefined): string | null =>
  cover?.asset ? urlFor(cover).width(600).url() : null;

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

  // Enrich each rack item (stock/price, from the private store doc) with its
  // public cover + blurb. Covers/descriptions live in the world-readable
  // `production` dataset — fetched here by id, never through the private
  // projection — so the security boundary doesn't move.
  const bookIds = rack.items
    .filter((i) => i.kind !== "rag" && i.bookId)
    .map((i) => i.bookId as string);
  const ragIds = rack.items
    .filter((i) => i.kind === "rag" && i.bookId)
    .map((i) => i.bookId as string);

  const [books, rags] = await Promise.all([
    bookIds.length
      ? safeFetch<BookSummary[]>(SAVED_BOOKS_QUERY, { ids: bookIds }, [])
      : Promise.resolve([]),
    ragIds.length
      ? safeFetch<ShelfRag[]>(RAG_ISSUES_BY_IDS_QUERY, { ids: ragIds }, [])
      : Promise.resolve([]),
  ]);
  const bookById = new Map(books.map((b) => [b._id, b]));
  const ragById = new Map(rags.map((r) => [r._id, r]));

  const maturityOf = (tier: MaturityTier | null) => ({
    maturityLabel: tier ? MATURITY_TIER_LABELS[tier] : null,
    maturityRestricted: tier === GATED_TIER,
  });

  const entries: ShelfEntry[] = rack.items.map((item, i) => {
    const key = item.bookId ?? `${item.kind}-${i}`;
    const stockLine = rackStockLine(
      item.lastCount,
      item.lastCountDate,
      settings.sections,
    );
    const priceLabel = item.price != null ? money(item.price) : null;

    if (item.kind === "rag") {
      const rag = item.bookId ? ragById.get(item.bookId) : undefined;
      const href = item.bookSlug ? `/magazine/${item.bookSlug}` : null;
      // Rags are compilations — ND Riot Rag, no single creator — and carry the
      // Mature mark the admin tool assigns them.
      return {
        key,
        kind: "rag",
        title: item.bookTitle ?? rag?.title ?? "ND Riot Rag",
        href,
        creatorName: "ND Riot Rag",
        creatorHref: null,
        coverUrl: coverUrlFor(rag?.cover),
        coverAlt: "",
        description: rag?.descriptionText ?? null,
        genres: null,
        format: null,
        ...maturityOf(GATED_TIER),
        priceLabel,
        stockLine,
        shareUrl: absoluteUrl(href ?? `/racks/${slug}`),
      };
    }

    const book = item.bookId ? bookById.get(item.bookId) : undefined;
    const href = item.bookSlug ? `/comics/${item.bookSlug}` : null;
    return {
      key,
      kind: "book",
      title: item.bookTitle ?? book?.title ?? "Untitled",
      href,
      creatorName: item.creatorName ?? book?.creatorName ?? null,
      creatorHref: item.creatorSlug ? `/creators/${item.creatorSlug}` : null,
      coverUrl: coverUrlFor(book?.cover),
      coverAlt: "",
      description: book?.descriptionText ?? null,
      genres: book?.genres ?? null,
      format: book?.format ?? null,
      ...maturityOf(book?.maturityRating ?? null),
      priceLabel,
      stockLine,
      shareUrl: absoluteUrl(href ?? `/racks/${slug}`),
    };
  });

  return (
    <Section padding="lg">
      <div className="space-y-3">
        {rack.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- cross-dataset asset (ndriot_auth), served direct from the CDN; next/image isn't configured for it
          <img
            src={rack.logoUrl}
            alt={`${storeTitle(rack)} logo`}
            className="h-30 w-auto max-w-[380px] object-contain"
          />
        )}
        {/* The logo leads when present, so the name steps down to a secondary
            label; without a logo it carries more weight as the sole identifier. */}
        <h1
          className={cn(
            "font-bold tracking-tight uppercase",
            rack.logoUrl
              ? "text-muted-foreground text-lg"
              : "text-3xl font-black tracking-tighter",
          )}
        >
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
        {entries.length === 0 ? (
          <p className="text-muted-foreground mt-4">
            Nothing on this rack right now.
          </p>
        ) : (
          <div className="mt-6">
            <SpinnerShelf
              entries={entries}
              shareLabel={settings.sections.shareLabel}
              linkCopiedLabel={settings.sections.linkCopiedLabel}
            />
          </div>
        )}
      </div>
    </Section>
  );
}

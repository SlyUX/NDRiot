import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { GenreBadge } from "@/components/genre-badge";
import { Badge } from "@/components/ui/badge";
import { urlFor } from "@/sanity/image";
import type { Genre, SanityImage } from "@/lib/types";

/**
 * One strip's full reading view — the page image at its natural aspect, credit,
 * meta, caption, genres, and (when it's part of a series) prev/next arrows.
 *
 * Shared by the standalone `/strips/[slug]` page (server) and the same-page
 * `StripGallery` (client). It carries no client hooks of its own, so it renders
 * on the server when the page uses it and joins the client bundle when the
 * gallery does. The difference is behavioral, passed in: give it `onNavigate`
 * and prev/next become buttons that swap the gallery's selection in place; omit
 * it and they're plain links to the neighbor's page. `onClose` renders a
 * collapse control (gallery only).
 */

export interface StripViewData {
  title: string;
  image: SanityImage | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  maturity: string | null;
  genres: string[] | null;
  creatorName: string | null;
  creatorSlug: string | null;
  seriesTitle: string | null;
  seriesSlug: string | null;
}

export interface StripNeighbor {
  slug: string;
  title: string;
}

function SeriesArrow({
  neighbor,
  direction,
  onNavigate,
}: {
  neighbor: StripNeighbor;
  direction: "prev" | "next";
  onNavigate?: (slug: string) => void;
}) {
  const isPrev = direction === "prev";
  const label = `${isPrev ? "Previous" : "Next"} in series: ${neighbor.title}`;
  const inner = (
    <>
      {isPrev && <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />}
      <span className="truncate">{neighbor.title}</span>
      {!isPrev && <ChevronRight aria-hidden="true" className="size-4 shrink-0" />}
    </>
  );
  const className =
    "text-primary focus-visible:ring-ring flex min-w-0 items-center gap-1.5 text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none";
  // Buttons in the gallery (swap in place), links on the page.
  return onNavigate ? (
    <button
      type="button"
      onClick={() => onNavigate(neighbor.slug)}
      aria-label={label}
      className={className}
    >
      {inner}
    </button>
  ) : (
    <Link href={`/strips/${neighbor.slug}`} aria-label={label} className={className}>
      {inner}
    </Link>
  );
}

export function StripView({
  strip,
  date,
  partOfLabel,
  prev,
  next,
  headingLevel = "h2",
  onNavigate,
  onClose,
}: {
  strip: StripViewData;
  date: string | null;
  partOfLabel: string;
  prev?: StripNeighbor | null;
  next?: StripNeighbor | null;
  /** `h1` on the standalone strip page; `h2` inline in the gallery (§10). */
  headingLevel?: "h1" | "h2";
  onNavigate?: (slug: string) => void;
  onClose?: () => void;
}) {
  const Heading = headingLevel;
  return (
    <div className="relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground absolute top-0 right-0 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-5" />
        </button>
      )}

      {/* Credit leads — a strip is someone's work, so the maker comes first.
          Always a link: tapping the creator leaves for their profile. */}
      {strip.creatorSlug && strip.creatorName && (
        <Link
          href={`/creators/${strip.creatorSlug}`}
          className="text-primary text-xs font-bold tracking-widest uppercase hover:underline"
        >
          {strip.creatorName}
        </Link>
      )}
      <Heading className="mt-1 pr-8 text-2xl font-black tracking-tighter uppercase md:text-3xl">
        {strip.title}
      </Heading>

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

      {/* Part of a series — the through-line + prev/next installments. */}
      {strip.seriesSlug && strip.seriesTitle && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{partOfLabel} </span>
            <Link
              href={`/series/${strip.seriesSlug}`}
              className="text-primary font-semibold hover:underline"
            >
              {strip.seriesTitle}
            </Link>
          </p>
          {(prev || next) && (
            <div className="flex min-w-0 items-center gap-4">
              {prev && <SeriesArrow neighbor={prev} direction="prev" onNavigate={onNavigate} />}
              {next && <SeriesArrow neighbor={next} direction="next" onNavigate={onNavigate} />}
            </div>
          )}
        </div>
      )}

      {/* The strip itself — natural aspect, capped at 75vh so the thumbnails
          below peek into the viewport (the "stage" doesn't fill the screen). */}
      {strip.image && (
        <div className="bg-muted mt-6 flex justify-center">
          <Image
            src={urlFor(strip.image).width(1600).url()}
            alt={strip.image.alt ?? strip.title}
            width={strip.width ?? 1600}
            height={strip.height ?? 2400}
            sizes="(max-width: 56rem) 100vw, 56rem"
            className="max-h-[75vh] w-auto max-w-full"
            priority
          />
        </div>
      )}

      {strip.caption && (
        <p className="mt-4 max-w-prose text-sm whitespace-pre-line">{strip.caption}</p>
      )}

      {strip.genres && strip.genres.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {strip.genres.map((g) => (
            <GenreBadge key={g} genre={g as Genre} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}

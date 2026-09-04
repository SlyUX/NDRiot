import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TaxonomyRow } from "@/components/content-card";
import { Button } from "@/components/ui/button";
import type { HeroBook } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { urlFor } from "@/sanity/image";

/**
 * The featured book — the full cover flush left, filling the panel's height at
 * its native 2:3 (nothing cropped), with the title and blurb beside it. The
 * whole panel links to the book. Stays a two-column row down to phones.
 *
 * Presentational + client-safe (no server-only deps), so both the server hero
 * and the client SpinnerRack (which swaps it on each spin) can render it.
 */
export function FeatureBook({
  book,
  ctaLabel,
  saveSlot,
}: {
  book: HeroBook;
  ctaLabel: string;
  saveSlot?: ReactNode;
}) {
  const preview =
    truncate(book.descriptionText, 280) ?? truncate(book.shortDescription, 280);
  const href = `/comics/${book.slug}`;

  // Not one big <Link> anymore: Save is a <button> and lives in the text column,
  // which can't sit inside an anchor. So the cover, title, and CTA each link to
  // the book instead; `group` keeps the whole-panel hover affordance.
  return (
    <div className="group border-border flex h-full min-h-[13rem] flex-row overflow-hidden border bg-black/40 sm:min-h-[26rem]">
      {/* The cover fills the panel height at its native 2:3 (nothing cropped). */}
      <Link
        href={href}
        aria-label={book.title}
        className="focus-visible:ring-ring bg-muted relative aspect-[2/3] h-full w-auto shrink-0 overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
      >
        {book.cover ? (
          <Image
            src={urlFor(book.cover).width(800).url()}
            alt={book.cover.alt ?? ""}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full" aria-hidden="true" />
        )}
        {book.fundingUrl && (
          <span className="bg-funding absolute top-2 left-2 z-10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
            Now Funding
          </span>
        )}
      </Link>

      {/* pr-12 on mobile keeps the top lines clear of the Discover button in
          the panel's corner; roomy uniform padding from sm up. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-4 pr-12 sm:p-8">
        {book.creatorName && (
          <p className="text-primary truncate text-xs font-bold tracking-widest uppercase">
            {book.creatorName}
          </p>
        )}
        <Link
          href={href}
          className="focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
        >
          <h2 className="text-base leading-tight font-black tracking-tight text-white uppercase group-hover:underline sm:text-2xl lg:text-3xl">
            {book.title}
          </h2>
        </Link>
        {/* Save — in the text flow directly under the title. self-start so it
            keeps its natural width instead of stretching the column. */}
        {saveSlot && <div className="self-start">{saveSlot}</div>}
        {/* Only the top genre on phones, where the column is tight; the full row
            from sm up. */}
        <TaxonomyRow
          genres={book.genres}
          format={book.format}
          className="max-sm:[&>*:nth-child(n+2)]:hidden"
        />
        {/* The blurb is room-permitting: hidden in the tight phone column, back
            from sm up. Cover + title + CTA carry the phone layout. */}
        {preview && (
          <p className="hidden text-sm leading-relaxed text-white/85 sm:line-clamp-4 sm:block sm:text-base">
            {preview}
          </p>
        )}
        {/* Primary CTA — "read it" is the point of the hero, so it's the pink
            button; Save (over the cover) is the outline secondary beside it. */}
        <Button
          asChild
          size="sm"
          className="mt-1 self-start font-black tracking-widest uppercase"
        >
          <Link href={href}>
            {ctaLabel}
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        </Button>
      </div>
    </div>
  );
}

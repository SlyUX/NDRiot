"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";

import { ShareBar } from "@/components/share-bar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BookFormat, Genre } from "@/lib/types";

/**
 * A store's public shelf as a grid of covers — the bookstore browse.
 *
 * Tapping a cover enlarges it into a centered modal and flips it to its "back
 * cover": title, creator credits, a blurb, price + stock, and share. You can
 * flip it back to admire the art, the way you'd turn a book over in a shop and
 * set it down again. Title → the comic page, creator → the creator page.
 *
 * Self-contained, serializable entries (cover URLs pre-built on the server), so
 * this stays a presentational client leaf — the one place the shelf needs
 * interactivity (§5: client only at the leaf). The 3D flip is gated behind
 * prefers-reduced-motion (§10); reduced motion swaps faces with no animation.
 */

export interface ShelfEntry {
  key: string;
  kind: "book" | "rag";
  title: string;
  /** The comic/magazine page, when the item has a public slug. */
  href: string | null;
  creatorName: string | null;
  creatorHref: string | null;
  coverUrl: string | null;
  coverAlt: string;
  description: string | null;
  genres: Genre[] | null;
  format: BookFormat | null;
  /** Reader-facing maturity label (e.g. "Mature"); null when none/all-ages. */
  maturityLabel: string | null;
  /** The restricted tier takes the solid-pink badge; others the outline. */
  maturityRestricted: boolean;
  /** Pre-formatted, e.g. "$12.00"; null when unpriced. */
  priceLabel: string | null;
  /** Pre-composed stock line, e.g. "3 in stock · counted Oct 28, 2026". */
  stockLine: string;
  /** Absolute URL for sharing the comic/magazine page. */
  shareUrl: string;
}

const COVER_FALLBACK =
  "bg-muted text-muted-foreground flex items-center justify-center text-center text-[10px] tracking-widest uppercase";

function Cover({
  url,
  alt,
  className,
  sizes,
}: {
  url: string | null;
  alt: string;
  className?: string;
  sizes: string;
}) {
  if (!url) {
    return (
      <div className={cn(COVER_FALLBACK, className)} aria-hidden>
        No cover
      </div>
    );
  }
  return (
    <Image src={url} alt={alt} fill sizes={sizes} className={cn("object-cover", className)} />
  );
}

function MaturityBadge({
  label,
  restricted,
  className,
}: {
  label: string;
  restricted: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant={restricted ? "default" : "outline"}
      className={cn(
        "absolute top-2 right-2 z-10 px-1.5 py-0 text-[10px] leading-4 tracking-wider uppercase",
        restricted
          ? "border-primary-foreground"
          : "bg-background/90 text-foreground border-white/25 backdrop-blur-sm",
        className,
      )}
    >
      {label}
    </Badge>
  );
}

export function SpinnerShelf({
  entries,
  shareLabel,
  linkCopiedLabel,
}: {
  entries: ShelfEntry[];
  shareLabel: string;
  linkCopiedLabel: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = entries.find((e) => e.key === openKey) ?? null;

  return (
    <>
      {/* Caps at six across; wraps down to two on phones. */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              onClick={() => setOpenKey(entry.key)}
              className="group focus-visible:ring-ring block w-full text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <div className="bg-muted relative aspect-[2/3] overflow-hidden">
                <Cover
                  url={entry.coverUrl}
                  alt={entry.coverAlt}
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw"
                  className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                />
                {entry.maturityLabel && (
                  <MaturityBadge
                    label={entry.maturityLabel}
                    restricted={entry.maturityRestricted}
                  />
                )}
              </div>
              <p className="mt-2 leading-tight font-bold tracking-tight group-hover:underline">
                {entry.title}
              </p>
              {entry.creatorName && (
                <p className="text-primary text-xs tracking-wide uppercase">
                  {entry.creatorName}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setOpenKey(null);
        }}
      >
        {active && (
          <ShelfCard
            key={active.key}
            entry={active}
            shareLabel={shareLabel}
            linkCopiedLabel={linkCopiedLabel}
          />
        )}
      </Dialog>
    </>
  );
}

function ShelfCard({
  entry,
  shareLabel,
  linkCopiedLabel,
}: {
  entry: ShelfEntry;
  shareLabel: string;
  linkCopiedLabel: string;
}) {
  // The turn is a scaleX squash rather than a 3D rotate: only ONE face is in the
  // DOM at a time, swapped while the card is edge-on (scaleX 0, invisible). No
  // backface-visibility, nothing to mirror — when the back shows, the cover and
  // its maturity badge simply aren't rendered. (3D backface culling proved
  // unreliable in Safari here.)
  const [faceBack, setFaceBack] = useState(false);
  const [edgeOn, setEdgeOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Turn to `back`: squash to edge, swap the face at the midpoint, open back up.
  // Reduced motion (handled globally, but the content swap is JS) → swap at once.
  const flipTo = useCallback((back: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFaceBack(back);
      return;
    }
    setEdgeOn(true);
    timer.current = setTimeout(() => {
      setFaceBack(back);
      setEdgeOn(false);
    }, 190);
  }, []);

  // Opens on the cover, then turns to the back on the first frame — in unison
  // with the dialog's own fade+zoom entrance. Cleans up its timer on close.
  useEffect(() => {
    const r = requestAnimationFrame(() => flipTo(true));
    return () => {
      cancelAnimationFrame(r);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flipTo]);

  return (
    <DialogContent className="max-w-xs border-0 bg-transparent p-0 sm:max-w-sm">
      {/* Radix needs a title + description for labelling; the visible title is
          on the back face (and links out), so these are screen-reader only. */}
      <DialogTitle className="sr-only">{entry.title}</DialogTitle>
      <DialogDescription className="sr-only">
        {entry.description ?? `${entry.title} on this spinner rack`}
      </DialogDescription>

      <div className="perspective-[1200px]">
        <div
          className={cn(
            "relative aspect-[2/3] w-full origin-center transition-transform duration-200 ease-in-out",
            edgeOn ? "scale-x-0" : "scale-x-100",
          )}
        >
          {faceBack ? (
            // Back — the blurb, title, credits, price/stock, share.
            <div className="bg-background punk-scroll flex h-full w-full flex-col gap-3 overflow-y-auto border border-white/15 p-5">
              <div>
                {entry.href ? (
                  <Link
                    href={entry.href}
                    className="hover:text-primary text-xl leading-tight font-black tracking-tight uppercase"
                  >
                    {entry.title}
                  </Link>
                ) : (
                  <span className="text-xl leading-tight font-black tracking-tight uppercase">
                    {entry.title}
                  </span>
                )}
                {entry.creatorName &&
                  (entry.creatorHref ? (
                    <Link
                      href={entry.creatorHref}
                      className="text-primary mt-1 block text-xs tracking-widest uppercase hover:underline"
                    >
                      {entry.creatorName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground mt-1 block text-xs tracking-widest uppercase">
                      {entry.creatorName}
                    </span>
                  ))}
              </div>

              {(entry.priceLabel || entry.stockLine) && (
                <p className="text-muted-foreground text-sm">
                  {entry.priceLabel ? `${entry.priceLabel} · ` : ""}
                  {entry.stockLine}
                </p>
              )}

              {entry.description && (
                <p className="text-foreground/90 line-clamp-[10] text-sm leading-relaxed">
                  {entry.description}
                </p>
              )}

              <div className="mt-auto pt-2">
                <ShareBar
                  title={entry.title}
                  url={entry.shareUrl}
                  label={shareLabel}
                  copiedLabel={linkCopiedLabel}
                />
              </div>
            </div>
          ) : (
            // Front — the cover art. A button that turns the card over.
            <button
              type="button"
              onClick={() => flipTo(true)}
              aria-label="Flip to the back"
              className="focus-visible:ring-ring absolute inset-0 cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="bg-muted relative h-full w-full overflow-hidden border border-white/15">
                <Cover
                  url={entry.coverUrl}
                  alt={entry.coverAlt}
                  sizes="(max-width: 640px) 90vw, 384px"
                />
                {entry.maturityLabel && (
                  <MaturityBadge
                    label={entry.maturityLabel}
                    restricted={entry.maturityRestricted}
                  />
                )}
              </div>
            </button>
          )}
        </div>

        {/* An explicit flip control, so the gesture is discoverable (the cover
            is also clickable). Round is the app-layer voice (§9). */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => flipTo(!faceBack)}
            className="focus-visible:ring-ring text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
          >
            <RotateCw className="size-3" />
            {faceBack ? "Cover" : "Back"}
          </button>
        </div>
      </div>
    </DialogContent>
  );
}

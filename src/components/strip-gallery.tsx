"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  ContentCardGrid,
  type GridColumns,
} from "@/components/content-card-grid";
import { StripView, type StripNeighbor } from "@/components/strip-view";
import { Section } from "@/components/ui/section";
import { formatDate, stripToCard } from "@/lib/card-mappers";
import type { StripSummary } from "@/lib/types";

/**
 * Same-page Strips browsing. The thumbnail grid renders exactly as before
 * (real `/strips/<slug>` links — crawlable, no-JS-safe, still in the sitemap),
 * but a plain click is intercepted: the strip expands INLINE above the grid,
 * pushing the thumbnails down, and the URL gets a shareable `?strip=<slug>`
 * without a server navigation (native History API, synced to useSearchParams).
 * Cmd/ctrl/middle-click still open the full page.
 *
 * Series prev/next is computed from the loaded set — every grid surface loads a
 * superset of any series (a series is one creator's), so the neighbors are
 * always present and exact.
 */
export function StripGallery({
  strips,
  partOfLabel,
  heading,
  headingSize,
  columns = 5,
  padding = "md",
  gridClassName,
  emptyMessage,
}: {
  strips: StripSummary[];
  partOfLabel: string;
  heading?: string;
  headingSize?: "sm" | "md" | "lg";
  columns?: GridColumns;
  padding?: "none" | "sm" | "md" | "lg";
  gridClassName?: string;
  emptyMessage: string;
}) {
  const searchParams = useSearchParams();

  // Local state is the source of truth for what's shown (instant), the URL is
  // kept in sync for sharing. Seeded from `?strip=` so a deep link opens
  // expanded; back/forward is handled by the popstate listener below (setState
  // in the handler, never in the effect body).
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    searchParams.get("strip"),
  );
  // While the close (X) animation plays, the reader stays mounted; the
  // strip-collapse keyframe's onAnimationEnd finalizes the unmount.
  const [closing, setClosing] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPop = () =>
      setSelectedSlug(new URLSearchParams(window.location.search).get("strip"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const selected = useMemo(
    () => strips.find((s) => s.slug === selectedSlug) ?? null,
    [strips, selectedSlug],
  );

  // Keep the opened reader in view (following prev/next too). No setState here.
  useEffect(() => {
    if (!selectedSlug) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    readerRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [selectedSlug]);

  const pushStrip = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("strip", slug);
    else params.delete("strip");
    const qs = params.toString();
    window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  // Open or navigate (grid click, prev/next) — instant, and cancels any close.
  const select = (slug: string) => {
    setClosing(false);
    setSelectedSlug(slug);
    pushStrip(slug);
  };

  // Close (X): play the collapse, then unmount on animation end.
  const requestClose = () => setClosing(true);
  const finalizeClose = (e: React.AnimationEvent) => {
    if (e.animationName !== "strip-collapse") return;
    setClosing(false);
    setSelectedSlug(null);
    pushStrip(null);
  };

  const neighbors = useMemo<{ prev: StripNeighbor | null; next: StripNeighbor | null }>(() => {
    if (!selected?.seriesId || !selected.slug) return { prev: null, next: null };
    const inSeries = strips
      .filter((s) => s.seriesId === selected.seriesId && s.slug)
      .sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    const i = inSeries.findIndex((s) => s.slug === selected.slug);
    const at = (n: number): StripNeighbor | null => {
      const s = inSeries[n];
      return s && s.slug ? { slug: s.slug, title: s.title } : null;
    };
    return { prev: i > 0 ? at(i - 1) : null, next: i >= 0 ? at(i + 1) : null };
  }, [strips, selected]);

  // Intercept a plain left-click on a strip card; let modified clicks through
  // so cmd/middle-click still open the full page in a new tab.
  const onGridClick = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const match = new URL(anchor.href, window.location.origin).pathname.match(
      /^\/strips\/([^/]+)$/,
    );
    if (!match) return;
    e.preventDefault();
    select(decodeURIComponent(match[1]));
  };

  return (
    <div>
      {/* Inline reader above the grid. `key` remounts on each selection so the
          strip-reveal keyframe replays — the "slide down" that pushes the
          thumbnails below it down. */}
      {selected && (
        <div
          key={selected.slug}
          className={closing ? "strip-collapse" : "strip-reveal"}
          onAnimationEnd={finalizeClose}
        >
          <div className="overflow-hidden">
            {/* No top padding on the open stage — the page header already
                spaces it; keep only the horizontal + a little below. */}
            <Section padding="none" maxWidth="wide" className="px-6 pb-2">
              <div ref={readerRef} className="scroll-mt-24">
                <StripView
                  strip={{
                    title: selected.title,
                    image: selected.image,
                    width: selected.dimensions?.width ?? null,
                    height: selected.dimensions?.height ?? null,
                    caption: selected.caption,
                    maturity: selected.maturity,
                    genres: selected.genres,
                    creatorName: selected.creatorName,
                    creatorSlug: selected.creatorSlug,
                    seriesTitle: selected.seriesTitle,
                    seriesSlug: selected.seriesSlug,
                  }}
                  date={formatDate(selected.publishedAt) ?? null}
                  partOfLabel={partOfLabel}
                  prev={neighbors.prev}
                  next={neighbors.next}
                  onNavigate={select}
                  onClose={requestClose}
                />
              </div>
            </Section>
          </div>
        </div>
      )}

      <div onClickCapture={onGridClick}>
        <ContentCardGrid
          cards={strips.map(stripToCard)}
          heading={heading}
          headingSize={headingSize}
          columns={columns}
          aspectRatio="cover"
          padding={padding}
          className={gridClassName}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}

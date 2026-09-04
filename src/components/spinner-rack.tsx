"use client";

import { useCallback, useRef, useState } from "react";
import { Shuffle } from "lucide-react";

import { FeatureBook } from "@/components/feature-book";
import { SaveButton } from "@/components/save-button";
import { SlideOnChange } from "@/components/slide-on-change";
import type { HeroFeatureItem } from "@/lib/hero-queue";

/** Load more picks once this few remain unseen, so a spin never waits on it. */
const REFILL_AT = 3;
/** Cap the exclude list sent to the refill so the URL stays short. */
const RECENT_WINDOW = 12;

/**
 * The hero spotlight, made instant. It holds a preloaded queue of uniform-random
 * picks (each drawn server-side from the whole catalog — §3 equal odds intact)
 * and advances through it on the client, so "Spin the Rack" is immediate instead
 * of a full page reload. The queue refills itself in the background from
 * /api/hero-queue as it runs low, so every book keeps its equal chance.
 *
 * The first pick is server-rendered (state seeds from `items` once), so the hero
 * is in the initial HTML for SEO/first paint; later spins are client-only. A row
 * shuffle re-renders the page with a fresh `items` prop, but this keeps its own
 * pick (state isn't re-seeded), so spinning a row never disturbs the hero.
 */
export function SpinnerRack({
  items: initialItems,
  featuredHeading,
  discoverLabel,
  ctaLabel,
  save,
}: {
  items: HeroFeatureItem[];
  featuredHeading: string;
  discoverLabel: string;
  ctaLabel: string;
  save: {
    signedIn: boolean;
    saveLabel: string;
    savedLabel: string;
    signInCopy: { title: string; body: string; cta: string };
  };
}) {
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const refilling = useRef(false);

  const refill = useCallback(async () => {
    if (refilling.current) return;
    refilling.current = true;
    try {
      const exclude = items
        .slice(-RECENT_WINDOW)
        .map((item) => item.book._id)
        .join(",");
      const res = await fetch(
        `/api/hero-queue?count=6&exclude=${encodeURIComponent(exclude)}`,
      );
      if (!res.ok) return;
      const data: unknown = await res.json();
      const more = (data as { items?: HeroFeatureItem[] }).items;
      if (Array.isArray(more) && more.length > 0) {
        setItems((prev) => [...prev, ...more]);
      }
    } catch {
      // A failed refill is non-fatal — the reader can still spin what's loaded.
    } finally {
      refilling.current = false;
    }
  }, [items]);

  const spin = useCallback(() => {
    let next: number;
    if (index + 1 < items.length) {
      next = index + 1;
    } else if (items.length <= 1) {
      next = index;
    } else {
      // Outran the refill (very fast clicking) — jump to another loaded pick so
      // the button always responds; the background refill catches up.
      next = index;
      while (next === index) next = Math.floor(Math.random() * items.length);
    }
    setIndex(next);
    // Top up in the background before the queue runs dry (event-driven, so no
    // setState-in-effect and no refill on a passive re-render from a row shuffle).
    if (items.length - next <= REFILL_AT) void refill();
  }, [index, items.length, refill]);

  const current = items[index] ?? items[0];
  if (!current) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Heading row: the section name left, the Spin control right. */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
          {featuredHeading}
        </h2>
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
        <button
          type="button"
          onClick={spin}
          className="focus-visible:ring-ring border-border text-foreground hover:border-primary hover:text-primary inline-flex shrink-0 items-center gap-1.5 border px-3 py-1 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {discoverLabel}
          <Shuffle aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
        </button>
      </div>

      {/* Slides in left-to-right on each spin (the pick changed); no animation on
          first paint, and reduced-motion makes it instant. */}
      <SlideOnChange token={current.book._id} className="flex-1">
        <FeatureBook
          book={current.book}
          ctaLabel={ctaLabel}
          saveSlot={
            current.own ? undefined : (
              <SaveButton
                // Keyed by the book so the pressed state resets to this pick's
                // saved value (initialSaved is read once, into useState).
                key={current.book._id}
                itemType="book"
                itemId={current.book._id}
                initialSaved={current.saved}
                signedIn={save.signedIn}
                variant="outline"
                saveLabel={save.saveLabel}
                savedLabel={save.savedLabel}
                signInCopy={save.signInCopy}
              />
            )
          }
        />
      </SlideOnChange>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { Shuffle } from "lucide-react";

import type { ContentCardProps } from "@/components/content-card";
import {
  ContentCardGrid,
  type ContentCardGridProps,
} from "@/components/content-card-grid";

/** Fisher–Yates, fresh each call — the shuffle is ephemeral client state, so it
 *  needs no seed or URL persistence. */
function shuffled(cards: ContentCardProps[]): ContentCardProps[] {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A signature of the current order, for the grid's slide-on-shuffle animation. */
function orderToken(cards: ContentCardProps[]): string {
  return cards.map((card) => card.itemId ?? card.href).join(",");
}

/**
 * A homepage card row whose shuffle happens INSTANTLY on the client instead of
 * as a full-page navigation. A reshuffle is a pure reorder of the loaded cards,
 * so it touches only this row — no re-fetch, no reload, nothing else moves. The
 * "Spin" button sits beside the section title (a title adornment); filters stay
 * in the FilterBar and still navigate (they belong in the URL, §3).
 *
 * Seeds its order from the server-rendered `cards` once. The homepage keys this
 * row by its content, so a filter change (new cards) remounts + re-seeds, while
 * a client reshuffle (same cards, new order) does not.
 */
export function ShuffleRow({
  cards,
  spinLabel,
  ...grid
}: Omit<ContentCardGridProps, "slideToken" | "titleAdornment"> & {
  /** Label for the Spin button beside the title. */
  spinLabel: string;
}) {
  const [order, setOrder] = useState(cards);
  const reshuffle = useCallback(() => {
    setOrder((prev) => (prev.length > 1 ? shuffled(prev) : prev));
  }, []);

  return (
    <ContentCardGrid
      {...grid}
      cards={order}
      slideToken={orderToken(order)}
      titleAdornment={
        <button
          type="button"
          onClick={reshuffle}
          className="focus-visible:ring-ring border-border text-foreground hover:border-primary hover:text-primary inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {spinLabel}
          <Shuffle aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
        </button>
      }
    />
  );
}

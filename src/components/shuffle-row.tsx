"use client";

import { useCallback, useState } from "react";

import type { ContentCardProps } from "@/components/content-card";
import {
  ContentCardGrid,
  type ContentCardGridProps,
} from "@/components/content-card-grid";
import { RowShuffleContext } from "@/components/row-shuffle-context";

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
 * as a full-page navigation. Because a reshuffle is a pure reorder of the loaded
 * cards, it touches only this row — no re-fetch, no reload, nothing else on the
 * page moves. Filters still navigate (they belong in the URL, §3); only the
 * shuffle button, wired through RowShuffleContext to the FilterBar in this row's
 * toolbar, reorders in place, and the grid slides it via slideToken.
 *
 * Seeds its order from the server-rendered `cards` once. The homepage keys this
 * row by its content, so a filter change (new cards) remounts and re-seeds,
 * while a client reshuffle (same cards, new order) does not.
 */
export function ShuffleRow({
  cards,
  ...grid
}: Omit<ContentCardGridProps, "slideToken">) {
  const [order, setOrder] = useState(cards);
  const reshuffle = useCallback(() => {
    setOrder((prev) => (prev.length > 1 ? shuffled(prev) : prev));
  }, []);

  return (
    <RowShuffleContext.Provider value={reshuffle}>
      <ContentCardGrid {...grid} cards={order} slideToken={orderToken(order)} />
    </RowShuffleContext.Provider>
  );
}

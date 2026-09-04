"use client";

import { createContext, useContext } from "react";

/**
 * Lets a homepage row's shuffle happen on the client instead of via a full-page
 * navigation. A ShuffleRow provides a reshuffle callback here; the FilterBar in
 * that row's toolbar reads it, so its shuffle button reorders the row in place
 * (instant, no re-fetch) rather than pushing a new URL. Absent (every other
 * page) → the FilterBar keeps its normal navigating shuffle.
 *
 * Its own tiny module so FilterBar doesn't have to import the whole ShuffleRow
 * (and the grid it renders) just to read the callback.
 */
export const RowShuffleContext = createContext<(() => void) | null>(null);

export function useRowShuffle() {
  return useContext(RowShuffleContext);
}

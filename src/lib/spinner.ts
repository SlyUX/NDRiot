import type { SpinnerStoreDoc, SpinnerRackItem } from "@/lib/types";

/** "State — Store Name" (the store's display title). */
export function storeTitle(store: {
  state?: string | null;
  storeName?: string | null;
}): string {
  return `${store.state ?? "??"} — ${store.storeName ?? "Store"}`;
}

export function money(n: number | null | undefined): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

/** The creator's share after the store's and ND Riot's cuts (0–1). */
export function creatorShare(store: SpinnerStoreDoc): number {
  const cut = (store.storeCutPercent ?? 0) + (store.ndRiotCutPercent ?? 0);
  return Math.max(0, 1 - cut / 100);
}

export interface CreatorEarnings {
  creatorId: string;
  creatorName: string;
  items: SpinnerRackItem[];
  soldUnits: number;
  gross: number; // Σ sold × price (full retail)
  expected: number; // gross × creatorShare
  paidTotal: number;
  outstanding: number; // expected − paidTotal
}

/**
 * Roll the rack up per creator: units sold, gross, the creator's expected cut,
 * what they've been paid, and what's still owed. Books with no creator id are
 * grouped under an "unknown" bucket so nothing is silently dropped.
 */
export function computeEarnings(store: SpinnerStoreDoc): CreatorEarnings[] {
  const share = creatorShare(store);
  const byCreator = new Map<string, CreatorEarnings>();

  for (const item of store.rack ?? []) {
    const id = item.creatorId ?? "unknown";
    const sold = item.sold ?? 0;
    const price = item.price ?? 0;
    const row =
      byCreator.get(id) ??
      ({
        creatorId: id,
        creatorName: item.creatorName ?? "Unknown creator",
        items: [],
        soldUnits: 0,
        gross: 0,
        expected: 0,
        paidTotal: 0,
        outstanding: 0,
      } satisfies CreatorEarnings);
    row.items.push(item);
    row.soldUnits += sold;
    row.gross += sold * price;
    byCreator.set(id, row);
  }

  for (const row of byCreator.values()) {
    row.expected = row.gross * share;
    row.paidTotal =
      store.payouts?.find((p) => p.creatorId === row.creatorId)?.paidTotal ?? 0;
    row.outstanding = row.expected - row.paidTotal;
  }

  return [...byCreator.values()].sort((a, b) =>
    a.creatorName.localeCompare(b.creatorName),
  );
}

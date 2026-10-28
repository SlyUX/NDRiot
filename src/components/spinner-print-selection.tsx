"use client";

import { useState } from "react";

/**
 * Batch slip printing for a store's rack (a thin client leaf — the rack table
 * itself stays server-rendered). Two actions:
 *  - Print all: opens the band route in ?all=1 mode (every item, qty = stock).
 *  - Print selected: checkbox-pick titles + per-item quantity (default = current
 *    stock), opens ?items=<id>:<qty>,… — e.g. for reprinting a top-up.
 * Both just open the existing /admin/spinner/[id]/band route; no data is written.
 */

export interface SpinnerPrintRow {
  bookId: string;
  title: string;
  author: string;
  isRag: boolean;
  lastCount: number;
}

const field =
  "focus-visible:ring-ring border border-white/20 bg-transparent px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function SpinnerPrintSelection({
  storeId,
  items,
}: {
  storeId: string;
  items: SpinnerPrintRow[];
}) {
  const [sel, setSel] = useState<Record<string, { checked: boolean; qty: number }>>(
    () =>
      Object.fromEntries(
        items.map((i) => [i.bookId, { checked: false, qty: i.lastCount || 1 }]),
      ),
  );

  const base = `/admin/spinner/${storeId}/band`;
  const open = (qs: string) => window.open(`${base}?${qs}`, "_blank", "noopener");

  const printAll = () => open("all=1");

  const printSelected = () => {
    const parts = items
      .filter((i) => sel[i.bookId]?.checked)
      .map((i) => `${i.bookId}:${Math.max(1, sel[i.bookId]?.qty || 1)}`);
    if (parts.length) open(`items=${encodeURIComponent(parts.join(","))}`);
  };

  const anyChecked = items.some((i) => sel[i.bookId]?.checked);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4 border border-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs tracking-widest uppercase">
          Print slips
        </p>
        <button
          type="button"
          onClick={printAll}
          className="bg-primary text-primary-foreground px-3 py-1.5 text-xs font-black tracking-widest uppercase"
        >
          Print all (by stock)
        </button>
      </div>

      <p className="text-muted-foreground text-xs">
        Or pick titles and quantities to reprint (e.g. for new stock):
      </p>

      <ul className="space-y-1">
        {items.map((i) => {
          const row = sel[i.bookId] ?? { checked: false, qty: 1 };
          return (
            <li key={i.bookId} className="flex items-center gap-3 text-sm">
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={(e) =>
                    setSel((s) => ({
                      ...s,
                      [i.bookId]: { ...row, checked: e.target.checked },
                    }))
                  }
                  className="accent-primary size-4 shrink-0"
                />
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{i.title}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {i.isRag ? "ND Riot Rag" : i.author}
                  </span>
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={row.qty}
                onChange={(e) =>
                  setSel((s) => ({
                    ...s,
                    [i.bookId]: { ...row, qty: Number(e.target.value) || 1 },
                  }))
                }
                aria-label={`Quantity for ${i.title}`}
                className={`${field} w-16 text-right`}
              />
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={printSelected}
        disabled={!anyChecked}
        className="border-primary text-primary border px-3 py-1.5 text-xs font-black tracking-widest uppercase disabled:opacity-40"
      >
        Print selected
      </button>
    </div>
  );
}

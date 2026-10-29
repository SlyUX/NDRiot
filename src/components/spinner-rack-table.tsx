"use client";

import { useState, useTransition } from "react";

import {
  removeRackItem,
  removeRackItems,
  updateRackItem,
} from "@/app/actions/spinner";
import {
  SpinnerRackPicker,
  type RackPick,
} from "@/components/spinner-rack-picker";

/**
 * The rack as a single interactive surface: a control row (add a comic / a Rag,
 * print all, and — once rows are checked — print or remove the selection) above
 * a table whose rows expand to their inventory edits and a precise-count print.
 *
 * Client because selection + expand are local UI state; the edits themselves are
 * server actions (`updateRackItem`/`removeRackItem(s)`) called straight from here.
 *
 * Printing: bulk is by inventory — "Print all" (every item × current stock) and
 * "Print selected" (checked items × stock, floored at 1 since the check is a
 * deliberate ask). A specific off-inventory count lives in the expanded row.
 */

export interface RackTableRow {
  key: string;
  bookId: string;
  kind: "book" | "rag";
  title: string;
  author: string;
  maturityLabel: string;
  price: number | null;
  lastCount: number | null;
  lastCountDate: string | null;
  sold: number | null;
  shrink: number | null;
  priceNote: string | null;
}

const money = (n: number | null | undefined) => `$${(n ?? 0).toFixed(2)}`;

const field =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";
const label =
  "text-muted-foreground mb-0.5 block text-[10px] tracking-widest uppercase";
const btn =
  "bg-primary text-primary-foreground px-3 py-1.5 text-xs font-black tracking-widest uppercase disabled:opacity-40";
const btnOutline =
  "border-primary text-primary border px-3 py-1.5 text-xs font-black tracking-widest uppercase disabled:opacity-40 disabled:border-white/20 disabled:text-muted-foreground";
const btnGhost =
  "text-muted-foreground hover:text-destructive text-[10px] font-black tracking-widest uppercase";

// Checkbox column + the six data columns, shared by the header and every row so
// they line up as a table.
const dataGrid =
  "grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_4.5rem_4.5rem_3.5rem_3.5rem] gap-x-3 items-center";

export function SpinnerRackTable({
  storeId,
  rows,
  bookPicks,
  ragPicks,
}: {
  storeId: string;
  rows: RackTableRow[];
  bookPicks: RackPick[];
  ragPicks: RackPick[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openPicker, setOpenPicker] = useState<"book" | "rag" | null>(null);
  const [isRemoving, startRemove] = useTransition();

  const base = `/admin/spinner/${storeId}/band`;
  const open = (qs: string) => window.open(`${base}?${qs}`, "_blank", "noopener");

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedRows = rows.filter((r) => selected.has(r.key));

  const printAll = () => open("all=1");

  const printSelected = () => {
    const parts = selectedRows.map(
      (r) => `${r.bookId}:${Math.max(1, r.lastCount ?? 0)}`,
    );
    if (parts.length) open(`items=${encodeURIComponent(parts.join(","))}`);
  };

  const removeSelected = () => {
    const keys = selectedRows.map((r) => r.key);
    if (keys.length === 0) return;
    const ok = window.confirm(
      `Remove ${keys.length} ${keys.length === 1 ? "item" : "items"} from the rack? This doesn't delete the comic — just takes it off this rack.`,
    );
    if (!ok) return;
    startRemove(async () => {
      await removeRackItems(storeId, keys);
      setSelected(new Set());
    });
  };

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-3">
      {/* Control row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpenPicker((p) => (p === "book" ? null : "book"))}
          className={openPicker === "book" ? btn : btnOutline}
        >
          ＋ Add a comic
        </button>
        <button
          type="button"
          onClick={() => setOpenPicker((p) => (p === "rag" ? null : "rag"))}
          className={openPicker === "rag" ? btn : btnOutline}
        >
          ＋ Add a Rag
        </button>

        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />

        <button type="button" onClick={printAll} className={btn} disabled={rows.length === 0}>
          Print all (by stock)
        </button>
        <button type="button" onClick={printSelected} className={btnOutline} disabled={!hasSelection}>
          Print selected{hasSelection ? ` (${selected.size})` : ""}
        </button>
        <button
          type="button"
          onClick={removeSelected}
          disabled={!hasSelection || isRemoving}
          className="border-destructive text-destructive hover:bg-destructive/10 border px-3 py-1.5 text-xs font-black tracking-widest uppercase disabled:border-white/20 disabled:text-muted-foreground"
        >
          {isRemoving ? "Removing…" : "Remove selected"}
        </button>
      </div>

      {/* Add picker (toggled from the control row) */}
      {openPicker === "book" && (
        <div className="border border-white/10 p-3">
          <SpinnerRackPicker storeId={storeId} kind="book" items={bookPicks} />
        </div>
      )}
      {openPicker === "rag" && (
        <div className="border border-white/10 p-3">
          <SpinnerRackPicker storeId={storeId} kind="rag" items={ragPicks} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No books on the rack yet.</p>
      ) : (
        <div className="border border-white/10">
          {/* Header */}
          <div className="grid grid-cols-[1.5rem_1fr] items-center gap-2 border-b border-white/10 px-2 py-1.5">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allSelected}
              onChange={() =>
                setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)))
              }
              className="accent-primary size-4"
            />
            <div className={`${dataGrid} text-muted-foreground text-[10px] tracking-widest uppercase`}>
              <span>Title</span>
              <span className="hidden sm:block">Author</span>
              <span className="hidden text-right sm:block">Rating</span>
              <span className="hidden text-right sm:block">Price</span>
              <span className="hidden text-right sm:block">Stock</span>
              <span className="hidden text-right sm:block">Sold</span>
            </div>
          </div>

          <ul>
            {rows.map((row) => {
              const isOpen = expanded.has(row.key);
              return (
                <li key={row.key} className="border-b border-white/10 last:border-b-0">
                  <div className="grid grid-cols-[1.5rem_1fr] items-center gap-2 px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.title}`}
                      checked={selected.has(row.key)}
                      onChange={() => setSelected((s) => toggle(s, row.key))}
                      className="accent-primary size-4"
                    />
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => toggle(s, row.key))}
                      aria-expanded={isOpen}
                      className={`${dataGrid} w-full text-left text-sm hover:text-primary`}
                    >
                      <span className="min-w-0 truncate font-semibold">
                        <span aria-hidden className="text-muted-foreground mr-1 inline-block w-3">
                          {isOpen ? "▾" : "▸"}
                        </span>
                        {row.title}
                        {row.kind === "rag" && (
                          <span className="text-muted-foreground ml-2 text-[10px] tracking-widest uppercase">
                            Rag
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground hidden min-w-0 truncate text-xs sm:block">
                        {row.author}
                      </span>
                      <span className="hidden text-right text-[10px] tracking-wider uppercase sm:block">
                        {row.maturityLabel}
                      </span>
                      <span className="hidden text-right tabular-nums sm:block">
                        {row.price != null ? money(row.price) : "—"}
                      </span>
                      <span className="hidden text-right tabular-nums sm:block">
                        {row.lastCount ?? "—"}
                      </span>
                      <span className="text-muted-foreground text-right tabular-nums">
                        {row.sold ?? 0}
                      </span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 bg-white/[0.02] px-3 pt-1 pb-4">
                      {/* Inventory + price edit */}
                      <form action={updateRackItem} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                        <input type="hidden" name="storeId" value={storeId} />
                        <input type="hidden" name="key" value={row.key} />
                        <div>
                          <label className={label}>Price $</label>
                          <input name="price" type="number" step="0.01" min={0} defaultValue={row.price ?? ""} className={field} />
                        </div>
                        <div>
                          <label className={label}>Last count</label>
                          <input name="lastCount" type="number" min={0} defaultValue={row.lastCount ?? ""} className={field} />
                        </div>
                        <div>
                          <label className={label}>Count date</label>
                          <input name="lastCountDate" type="date" defaultValue={row.lastCountDate ?? ""} className={field} />
                        </div>
                        <div>
                          <label className={label}>Sold</label>
                          <input name="sold" type="number" min={0} defaultValue={row.sold ?? 0} className={field} />
                        </div>
                        <div>
                          <label className={label}>Shrink</label>
                          <input name="shrink" type="number" min={0} defaultValue={row.shrink ?? 0} className={field} />
                        </div>
                        <div className="flex items-end">
                          <button type="submit" className={btn}>Save</button>
                        </div>
                        <div className="col-span-2 sm:col-span-6">
                          <label className={label}>Price note (optional)</label>
                          <input name="priceNote" type="text" defaultValue={row.priceNote ?? ""} placeholder="e.g. raised to offset commission" className={field} />
                        </div>
                      </form>

                      <div className="flex flex-wrap items-end justify-between gap-3">
                        {/* Precise-count print for this one title (the off-inventory case) */}
                        <form method="get" action={base} target="_blank" className="flex items-end gap-2">
                          <input type="hidden" name="book" value={row.bookId} />
                          <div>
                            <label className={label}>Print — qty</label>
                            <input name="qty" type="number" min={1} max={200} defaultValue={row.lastCount || 1} className={`${field} w-20`} />
                          </div>
                          <button type="submit" className={btnOutline}>Print slips</button>
                        </form>
                        <form action={removeRackItem}>
                          <input type="hidden" name="storeId" value={storeId} />
                          <input type="hidden" name="key" value={row.key} />
                          <button type="submit" className={btnGhost}>Remove from rack</button>
                        </form>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

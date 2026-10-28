"use client";

import { useState, useTransition } from "react";

import { addBookToRack, addRagToRack } from "@/app/actions/spinner";

const fieldClass =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none";

/** A normalized pick row — a comic (subtitle = creator) or a Rag issue (subtitle = "Issue N"). */
export interface RackPick {
  _id: string;
  title: string | null;
  subtitle: string | null;
}

/**
 * Add-an-item picker for a store's rack, over either comics or Rag issues
 * (`kind`). Searches the list passed from the server and calls the matching
 * admin action, which re-fetches the item server-side and denormalizes it. The
 * action revalidates the page, so the new rack item appears without a refresh.
 */
export function SpinnerRackPicker({
  storeId,
  kind,
  items,
}: {
  storeId: string;
  kind: "book" | "rag";
  items: RackPick[];
}) {
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const filtered = (
    query
      ? items.filter(
          (it) =>
            (it.title ?? "").toLowerCase().includes(query) ||
            (it.subtitle ?? "").toLowerCase().includes(query),
        )
      : items
  ).slice(0, 15);

  const add = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      if (kind === "rag") await addRagToRack(storeId, id);
      else await addBookToRack(storeId, id);
      setBusyId(null);
    });
  };

  const placeholder = kind === "rag" ? "Search Rag issues…" : "Search comics or creators…";
  const emptyText = kind === "rag" ? "No matching Rag issues." : "No matching comics.";

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
      <ul className="divide-border divide-y border-y border-white/10">
        {filtered.map((it) => (
          <li key={it._id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-semibold">{it.title}</span>
              {it.subtitle && <span className="text-muted-foreground"> — {it.subtitle}</span>}
            </span>
            <button
              type="button"
              onClick={() => add(it._id)}
              disabled={pending && busyId === it._id}
              className="text-primary shrink-0 text-xs font-black tracking-widest uppercase disabled:opacity-50"
            >
              {pending && busyId === it._id ? "Adding…" : "+ Add"}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-muted-foreground py-2 text-sm">{emptyText}</li>
        )}
      </ul>
    </div>
  );
}

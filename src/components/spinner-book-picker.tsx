"use client";

import { useState, useTransition } from "react";

import { addBookToRack } from "@/app/actions/spinner";
import type { SpinnerBookPick } from "@/lib/types";

const fieldClass =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none";

/**
 * Add-a-book picker for a store's rack. Searches the (public) book list passed
 * from the server and calls the admin action, which re-fetches the book
 * server-side and denormalizes it. The action revalidates the page, so the new
 * rack item appears without a manual refresh.
 */
export function SpinnerBookPicker({
  storeId,
  books,
}: {
  storeId: string;
  books: SpinnerBookPick[];
}) {
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const filtered = (
    query
      ? books.filter(
          (b) =>
            (b.title ?? "").toLowerCase().includes(query) ||
            (b.creator?.name ?? "").toLowerCase().includes(query),
        )
      : books
  ).slice(0, 15);

  const add = (bookId: string) => {
    setBusyId(bookId);
    startTransition(async () => {
      await addBookToRack(storeId, bookId);
      setBusyId(null);
    });
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        placeholder="Search books or creators…"
        className={fieldClass}
      />
      <ul className="divide-border divide-y border-y border-white/10">
        {filtered.map((b) => (
          <li key={b._id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-semibold">{b.title}</span>
              {b.creator?.name && (
                <span className="text-muted-foreground"> — {b.creator.name}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => add(b._id)}
              disabled={pending && busyId === b._id}
              className="text-primary shrink-0 text-xs font-black tracking-widest uppercase disabled:opacity-50"
            >
              {pending && busyId === b._id ? "Adding…" : "+ Add"}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-muted-foreground py-2 text-sm">No matching books.</li>
        )}
      </ul>
    </div>
  );
}

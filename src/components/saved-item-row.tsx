"use client";

import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

import { removeSaveAction, toggleSaveAction } from "@/app/actions/saves";

/**
 * A saved item on the dashboard with a destructive Remove. Two layouts: `row` (a
 * feed-style line with a title) and `tile` (a cover that links to the item, with
 * the Remove tucked in a corner — for the wrapping cover grids).
 *
 * Remove is optimistic and commits immediately, then the item's own slot becomes
 * an in-place "Removed <title> — Undo" for a few seconds (contextual, right where
 * your eyes are — not a toast to miss at the bottom). Undo restores it in place
 * and re-saves; otherwise it commits and the slot disappears. The thumbnail is a
 * slot so the server page keeps using next/image.
 */
const UNDO_MS = 6000;

export function SavedItemRow({
  itemId,
  itemType,
  title,
  href,
  thumb,
  removeLabel,
  removedLabel,
  undoLabel,
  layout = "row",
  tileAspect = "portrait",
  caption = false,
}: {
  itemId: string;
  itemType: "book" | "creator";
  title: string;
  href: string | null;
  thumb: ReactNode;
  removeLabel: string;
  removedLabel: string;
  undoLabel: string;
  layout?: "row" | "tile";
  /** Tile thumbnail shape — `portrait` (2:3 covers) or `square` (creator photos). */
  tileAspect?: "portrait" | "square";
  /** Tile only: show the title beneath the thumbnail (creators, whose covers alone don't identify them). */
  caption?: boolean;
}) {
  const [state, setState] = useState<"visible" | "undo" | "gone">("visible");
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tileAspectClass =
    tileAspect === "square" ? "aspect-square" : "aspect-[2/3]";

  if (state === "gone") return null;

  function onRemove() {
    setState("undo");
    startTransition(async () => {
      await removeSaveAction(itemId);
    });
    timer.current = setTimeout(() => setState("gone"), UNDO_MS);
  }

  function onUndo() {
    if (timer.current) clearTimeout(timer.current);
    setState("visible");
    startTransition(async () => {
      await toggleSaveAction(itemType, itemId, pathname);
    });
  }

  // The in-place undo notice, shaped to the slot it replaces.
  if (state === "undo") {
    if (layout === "tile") {
      return (
        <li
          className={`border-primary flex ${tileAspectClass} flex-col items-center justify-center gap-1 border-2 p-1 text-center`}
        >
          <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
            {removedLabel}
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="text-primary focus-visible:ring-ring text-xs font-black tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {undoLabel}
          </button>
        </li>
      );
    }
    return (
      <li className="border-primary flex items-center justify-between gap-3 border-b-2 py-3">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
          <span className="text-foreground font-bold">{removedLabel}</span>{" "}
          {title}
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="text-primary focus-visible:ring-ring shrink-0 text-sm font-black tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {undoLabel}
        </button>
      </li>
    );
  }

  if (layout === "tile") {
    return (
      <li className="relative">
        {href ? (
          <Link
            href={href}
            aria-label={title}
            className="focus-visible:ring-ring block focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
          >
            {thumb}
          </Link>
        ) : (
          thumb
        )}
        {caption && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-center text-[11px] leading-tight">
            {title}
          </p>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={removeLabel}
          className="focus-visible:ring-ring hover:text-primary absolute top-0 right-0 inline-flex bg-black/70 p-1 text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </li>
    );
  }

  return (
    <li className="border-border flex items-center gap-3 border-b py-3">
      {thumb}
      {href ? (
        <Link
          href={href}
          className="hover:text-primary min-w-0 flex-1 truncate text-sm font-bold transition-colors"
        >
          {title}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {title}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label={removeLabel}
        className="focus-visible:ring-ring hover:text-primary shrink-0 text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

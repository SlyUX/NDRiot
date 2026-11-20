import Link from "next/link";
import { Lock } from "lucide-react";

import { formatDate } from "@/lib/card-mappers";
import type { ForumBoard } from "../../sanity.types";

/**
 * The forum board list — each board with its per-board unread marker and latest
 * thread. Shared by the /forum home and the Comms "Forum" tab on the dashboard
 * (§4: one component, two entry points). Presentational — the caller fetches the
 * categories, unread map, and latest map, and owns the surrounding spacing.
 */
export function ForumBoardList({
  categories,
  unread,
  latest,
  newLabel,
  latestLabel,
}: {
  categories: ForumBoard[];
  unread: Map<string, number>;
  latest: Map<string, { title: string; lastPostAt: string | null }>;
  newLabel: string;
  latestLabel: string;
}) {
  return (
    <ul className="border-border divide-border divide-y border-y">
      {categories.map((cat) => {
        const n = unread.get(cat._id) ?? 0;
        const last = latest.get(cat._id);
        return (
          <li key={cat._id}>
            <Link
              href={`/forum/${cat.slug.current}`}
              className="group focus-visible:ring-primary flex items-start gap-4 py-4 outline-none focus-visible:ring-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="group-hover:text-primary font-black tracking-tight uppercase">
                    {cat.title}
                  </span>
                  {cat.adminOnlyPosts && (
                    <Lock
                      className="text-muted-foreground size-3.5"
                      aria-label="Admin-only posting"
                    />
                  )}
                  {n > 0 && (
                    <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      {newLabel}
                    </span>
                  )}
                </div>
                {cat.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {cat.description}
                  </p>
                )}
                {last && (
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {latestLabel}: {last.title}
                    {last.lastPostAt ? ` · ${formatDate(last.lastPostAt)}` : ""}
                  </p>
                )}
              </div>
              <span
                aria-hidden
                className="text-muted-foreground group-hover:text-primary mt-1 shrink-0"
              >
                →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

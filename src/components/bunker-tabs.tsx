"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Newspaper,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  feed: Newspaper,
  events: CalendarDays,
  comics: BookOpen,
  activity: Activity,
  profile: UserRound,
};

export interface BunkerTab {
  id: string;
  label: string;
  /** A link tab (e.g. Profile → the public profile) — renders as a link that
   *  navigates away instead of an in-place panel; it has no content. */
  href?: string;
  content?: React.ReactNode;
}

/**
 * The Bunker's in-place sub-tabs (/me) — Feed · Activity · Comics, plus a
 * Profile link out to the public profile. Icon-on-top / text-beneath, matching
 * the user-nav island, swapped in place so the identity header stays put. The
 * active panel is pink; a link tab just navigates.
 */
export function BunkerTabs({
  tabs,
  initial,
}: {
  tabs: BunkerTab[];
  initial?: string;
}) {
  const ids = tabs.map((t) => t.id);
  const [active, setActive] = useState(() =>
    initial && ids.includes(initial) ? initial : (ids[0] ?? ""),
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bunker"
        className="border-border flex gap-1 border-b sm:gap-2"
      >
        {tabs.map((t) => {
          const Icon = ICONS[t.id] ?? Newspaper;
          const tabClass =
            "focus-visible:ring-ring flex flex-1 flex-col items-center gap-1.5 px-2 py-3 text-[11px] font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none sm:flex-none sm:px-4";
          // A link tab (Profile) navigates away — a plain link, never the active
          // panel, so no tab/selected semantics.
          if (t.href) {
            return (
              <Link
                key={t.id}
                href={t.href}
                className={cn(
                  tabClass,
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {t.label}
              </Link>
            );
          }
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`bunker-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`bunker-panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={cn(
                tabClass,
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tabs
          .filter((t) => !t.href)
          .map((t) => (
            <div
              key={t.id}
              role="tabpanel"
              id={`bunker-panel-${t.id}`}
              aria-labelledby={`bunker-tab-${t.id}`}
              hidden={t.id !== active}
            >
              {t.content}
            </div>
          ))}
      </div>
    </div>
  );
}

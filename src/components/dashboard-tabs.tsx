"use client";

import { useCallback, useRef, useState } from "react";
import {
  Activity,
  Bookmark,
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * id → icon. Kept here (not passed as a prop) so the server page hands over
 * plain string ids, which stay serializable across the RSC boundary.
 */
const ICONS: Record<string, LucideIcon> = {
  bunker: LayoutDashboard,
  activity: Activity,
  network: Users,
  saved: Bookmark,
  settings: SlidersHorizontal,
};

export interface DashboardPanel {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * The /me segmented dashboard — one panel visible at a time, swapped in place so
 * it reads as "same page, different tab" (no navigation, nothing refetched). The
 * active tab syncs to `?view=` so a panel is linkable/deep-linkable without a
 * reload. Each tab carries an icon + label and a real accessible name (§10), and
 * the bar sticks under the site nav so access stays visible while scrolling.
 *
 * Panels are server-rendered and passed as `content` (ReactNode) — all of them
 * stay in the DOM, hidden when inactive, which is what makes switching instant.
 */
export function DashboardTabs({
  panels,
  initial,
}: {
  panels: DashboardPanel[];
  initial?: string;
}) {
  const ids = panels.map((p) => p.id);
  const [active, setActive] = useState(() =>
    initial && ids.includes(initial) ? initial : (ids[0] ?? ""),
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  const select = useCallback((id: string) => {
    setActive(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", id);
      window.history.replaceState(null, "", url);
    } catch {
      /* URL sync is a convenience; never fatal */
    }
    // Bring the bar to just under the sticky nav so each tab starts at its top.
    wrapRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div ref={wrapRef} className="scroll-mt-16">
      {/* Sticky tab bar. top-16 clears the sticky site nav; scroll-mt-16 above
          keeps scrollIntoView from tucking the bar under it. */}
      <div
        role="tablist"
        aria-label="Dashboard"
        className="border-primary/40 bg-background sticky top-16 z-30 flex gap-1 overflow-x-auto border-b px-4 sm:px-6"
      >
        {panels.map((p) => {
          const Icon = ICONS[p.id] ?? LayoutDashboard;
          const isActive = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`dash-tab-${p.id}`}
              aria-selected={isActive}
              aria-controls={`dash-panel-${p.id}`}
              onClick={() => select(p.id)}
              className={cn(
                "focus-visible:ring-ring flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      {panels.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`dash-panel-${p.id}`}
          aria-labelledby={`dash-tab-${p.id}`}
          hidden={p.id !== active}
        >
          {p.content}
        </div>
      ))}
    </div>
  );
}

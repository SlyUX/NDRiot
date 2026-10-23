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
 * active tab syncs to `?view=` for deep-linking. Two nav treatments, Instagram-
 * style: a sticky top bar on desktop (aligned to the content gutter) and a fixed
 * bottom island on phones — which also moves the dashboard nav away from the top,
 * where the site nav already lives. Every tab has an icon + label + accessible
 * name (§10). Panels all stay mounted (hidden when inactive) for instant swaps.
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
    // Bring the dashboard to just under the sticky nav so each tab starts at top.
    wrapRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div ref={wrapRef}>
      {/* Desktop: the section nav is THE sticky bar on /me (the main nav scrolls
          away). Boxed to match the home launcher — pink border on all four edges,
          content-width, ~10px margins — but opaque (bg-background) + sticky so
          content scrolls cleanly under the floating box. px-6 on the transparent
          sticky outer keeps the box content-aligned. */}
      <div className="sticky top-0 z-30 hidden px-6 md:block">
        <div
          role="tablist"
          aria-label="Dashboard"
          className="border-primary/40 bg-background mx-auto my-2.5 flex max-w-[90rem] gap-1 overflow-x-auto border"
        >
          {panels.map((p) => {
            const Icon = ICONS[p.id] ?? LayoutDashboard;
            const isActive = p.id === active;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`dash-tab-d-${p.id}`}
                aria-selected={isActive}
                aria-controls={`dash-panel-${p.id}`}
                onClick={() => select(p.id)}
                className={cn(
                  "focus-visible:ring-ring flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels — all mounted; inactive hidden for instant swaps. (The layout
          footer's bottom padding clears the fixed mobile island.) */}
      <div>
        {panels.map((p) => (
          <div
            key={p.id}
            role="tabpanel"
            id={`dash-panel-${p.id}`}
            hidden={p.id !== active}
          >
            {p.content}
          </div>
        ))}
      </div>

      {/* Phones: fixed bottom island (square — the punk read, §9). Detached from
          the edges (inset-x-3 / bottom-3) so it reads as a floating island. */}
      <div
        role="tablist"
        aria-label="Dashboard"
        className="border-primary/40 bg-background fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 border shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:hidden"
      >
        {panels.map((p) => {
          const Icon = ICONS[p.id] ?? LayoutDashboard;
          const isActive = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`dash-tab-m-${p.id}`}
              aria-selected={isActive}
              aria-controls={`dash-panel-${p.id}`}
              onClick={() => select(p.id)}
              className={cn(
                "focus-visible:ring-ring flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase leading-none transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

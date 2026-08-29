"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PanelTab {
  id: string;
  label: string;
  content: ReactNode;
  /** Trailing control shown on the tab row only while this tab is active
   *  (e.g. "Post an Update" on the Updates tab). */
  action?: ReactNode;
}

/**
 * A dashboard column that flips between panels in place. The tab labels stand
 * in for the panels' own headings, so the panels are passed in headingless. The
 * active tab's optional `action` sits at the right of the tab row.
 *
 * Client, but the panels are server-rendered and handed in as `content`, so all
 * their data is fetched up front and switching tabs is instant. A single-tab
 * column still renders (one tab, no flip) — callers drop empty columns.
 */
export function TabbedPanel({ tabs }: { tabs: PanelTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div>
      <div className="border-border flex items-center justify-between gap-2 border-b">
        <div className="flex gap-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === current.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "focus-visible:ring-ring -mb-px border-b-2 px-3 py-2 text-xs font-black tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none",
                t.id === current.id
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {current.action}
      </div>
      <div className="mt-4">{current.content}</div>
    </div>
  );
}

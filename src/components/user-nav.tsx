"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bookmark,
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  bunker: LayoutDashboard,
  activity: Activity,
  network: Users,
  saved: Bookmark,
  settings: SlidersHorizontal,
};

export interface UserNavItem {
  id: string;
  label: string;
}

/**
 * The persistent "user nav" for signed-in readers — the dashboard's section nav
 * as LINKS into /me?view=<id>, shown on every page so ND Riot reads as a hybrid
 * of mobile app + informational site. Desktop: a boxed bar tucked beneath the
 * main (website) nav, static (the main nav is the sticky one here). Mobile: a
 * fixed bottom island, like the dashboard.
 *
 * Hidden on /me itself — there the dashboard's own in-place tabs (DashboardTabs)
 * are the nav, so this would double it up.
 */
export function UserNav({ items }: { items: UserNavItem[] }) {
  const pathname = usePathname();
  if (pathname === "/me") return null;

  const linkClass =
    "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none";

  return (
    <>
      {/* Desktop: boxed launcher beneath the main nav. px-6 on the outer /
          max-w on the inner so it aligns with the page content. */}
      <div className="hidden px-6 md:block">
        <nav
          aria-label="Your dashboard"
          className="border-primary/40 mx-auto my-2.5 flex max-w-[90rem] gap-1 overflow-x-auto border"
        >
          {items.map((item) => {
            const Icon = ICONS[item.id] ?? LayoutDashboard;
            return (
              <Link key={item.id} href={`/me?view=${item.id}`} className={linkClass}>
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Phones: fixed bottom island (square — the punk read, §9), detached from
          the edges so it floats, like the dashboard's. */}
      <nav
        aria-label="Your dashboard"
        className="border-primary/40 bg-background fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 border shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:hidden"
      >
        {items.map((item) => {
          const Icon = ICONS[item.id] ?? LayoutDashboard;
          return (
            <Link
              key={item.id}
              href={`/me?view=${item.id}`}
              className={cn(
                "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold leading-none uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

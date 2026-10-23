"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * The site header shell. Sticky on every page EXCEPT the dashboard (/me), where
 * the main nav is allowed to scroll away and the dashboard's own section nav
 * becomes the sticky one — so the dashboard reads as a focused "app" surface
 * with a single persistent nav rather than two stacked sticky bars.
 *
 * Content (logo, nav, bell, account links) is server-rendered in the layout and
 * passed as children; only the sticky behavior needs the client/pathname.
 */
export function SiteHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sticky = pathname !== "/me";
  return (
    <header
      className={cn(
        // px-6 here (not on the inner nav) so the nav's max-w-[90rem] container
        // aligns with the page content, which pads the full-bleed outer too.
        "border-primary/40 bg-background z-50 border-b px-6",
        // `relative` (not static) when not sticky, so the mobile nav drawer —
        // positioned `absolute top-full` — still anchors to the header on /me.
        sticky ? "sticky top-0" : "relative",
      )}
    >
      {children}
    </header>
  );
}

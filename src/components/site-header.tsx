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
        "border-primary/40 bg-background z-50 border-b",
        sticky && "sticky top-0",
      )}
    >
      {children}
    </header>
  );
}

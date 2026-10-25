"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bookmark,
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  network: Users,
  saved: Bookmark,
  settings: SlidersHorizontal,
};

export interface UserNavItem {
  id: string;
  label: string;
}

/**
 * The persistent "user nav" for signed-in readers — links into the dashboard
 * (/me?view=<id>), on every page: a hybrid of mobile app + informational site.
 * Desktop: a boxed, rounded bar tucked beneath the main nav. Mobile: a fixed
 * rounded island. Icon-on-top / text-beneath; the Bunker tab's icon is the
 * reader's avatar. Round corners + avatar are the app layer's visual voice (§9).
 *
 * Active-aware: on /me the current ?view is highlighted in pink; elsewhere
 * nothing is active (you're on the website, not inside a section).
 */
export function UserNav({
  items,
  avatarUrl,
}: {
  items: UserNavItem[];
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onMe = pathname === "/me";
  const currentView = onMe ? (searchParams.get("view") ?? "bunker") : null;

  // Every tab uses a single canonical ?view= URL — Bunker included (/me?view=bunker,
  // not a bare /me). The bare /me and /me?view=bunker are the SAME view, and giving
  // Bunker the bare form made the two representations oscillate: the App Router
  // ping-ponged RSC fetches between /me and /me?view=bunker on a Bunker click
  // (visible as a request storm that stalled navigation). One canonical href per
  // view fixes it. Bare /me still renders Bunker (entry via the logo / sign-in),
  // and currentView below treats it as Bunker so the tab still highlights there.
  const hrefFor = (id: string) => `/me?view=${id}`;

  const icon = (id: string, active: boolean) => {
    if (id === "bunker" && avatarUrl) {
      return (
        <span
          className={cn(
            "relative block size-6 shrink-0 overflow-hidden rounded-full",
            active && "ring-primary ring-2",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        </span>
      );
    }
    const Icon = ICONS[id] ?? LayoutDashboard;
    return <Icon aria-hidden="true" className="size-5" />;
  };

  const tab = (item: UserNavItem, variant: "bar" | "island") => {
    const active = currentView === item.id;
    return (
      <Link
        key={item.id}
        href={hrefFor(item.id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-visible:ring-ring flex flex-col items-center gap-1 text-[10px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
          variant === "bar" ? "px-3 py-2.5" : "py-2.5 leading-none",
          active ? "text-primary" : "text-muted-foreground hover:text-primary",
        )}
      >
        {icon(item.id, active)}
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop: a plain icon-top tab row beneath the main nav (no box/border/
          extra margin). px-6 outer / max-w inner aligns with content. Left-
          aligned and natural width — the tabs sit together at the left gutter
          rather than stretching across the full width. */}
      <div className="hidden px-6 md:block">
        <nav
          aria-label="Your dashboard"
          className="mx-auto flex max-w-[90rem] justify-start gap-1 py-1"
        >
          {items.map((item) => tab(item, "bar"))}
        </nav>
      </div>

      {/* Phones: fixed rounded island, detached from the edges so it floats and
          clears rounded device corners (esp. iOS). */}
      <nav
        aria-label="Your dashboard"
        className="border-primary/40 bg-background fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-full border px-2 shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:hidden"
      >
        {items.map((item) => tab(item, "island"))}
      </nav>
    </>
  );
}

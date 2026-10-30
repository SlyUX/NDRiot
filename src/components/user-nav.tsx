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
  /** An explicit destination (e.g. the Rag submit item → /magazine/<slug>).
   *  Without it the item links to the dashboard view /me?view=<id>. */
  href?: string;
  /** Short text shown in the icon slot instead of a glyph (e.g. the Rag issue
   *  number "003" on the Submit item), in a bold condensed style. */
  iconText?: string;
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
    const href = item.href ?? hrefFor(item.id);
    // An href item (the Rag submit shortcut) is active when its path matches;
    // a dashboard item is active when its ?view= is the current one.
    const active = item.href
      ? pathname === item.href.split("?")[0]
      : currentView === item.id;
    // Icon slot: a number (e.g. the Rag issue "003"), the avatar, or a glyph.
    // Fixed height so every tab's text baseline lands at the same y when the row
    // bottom-aligns, regardless of which lead it uses.
    const lead = item.iconText ? (
      <span className="flex h-6 items-center text-lg leading-none font-black tracking-[-0.06em] tabular-nums">
        {item.iconText}
      </span>
    ) : (
      icon(item.id, active)
    );
    return (
      <Link
        key={item.id}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group focus-visible:ring-ring flex flex-col items-center justify-end gap-1 text-[10px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
          variant === "bar" ? "px-3 py-2.5" : "py-2.5 leading-none",
        )}
      >
        {/* Colors split by element: on the --surface-alt band pink is 3.99:1, which
            clears the 3:1 floor for the icon (a large, non-text glyph) but FAILS AA
            for the small label (§9) — so the active/hover accent lives on the icon,
            and the label uses white (active) / muted (idle), both AA here. */}
        <span
          className={cn(
            "flex items-center justify-center",
            active ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        >
          {lead}
        </span>
        <span
          className={cn(
            "max-w-[7rem] text-center leading-tight",
            active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop: a plain icon-top tab row beneath the main nav (no box/border/
          extra margin). px-6 outer / max-w inner aligns with content. Left-
          aligned and natural width — the tabs sit together at the left gutter
          rather than stretching across the full width. */}
      <div className="bg-surface-alt border-primary hidden border-b px-6 md:block">
        <nav
          aria-label="Your dashboard"
          className="mx-auto flex max-w-[90rem] items-end justify-center gap-1 py-1"
        >
          {items.map((item) => tab(item, "bar"))}
        </nav>
      </div>

      {/* Phones: fixed rounded island, detached from the edges so it floats and
          clears rounded device corners (esp. iOS). */}
      <nav
        aria-label="Your dashboard"
        className={cn(
          "border-primary/40 bg-surface-alt fixed inset-x-3 bottom-3 z-40 grid items-end rounded-full border px-2 shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:hidden",
          items.length >= 5 ? "grid-cols-5" : "grid-cols-4",
        )}
      >
        {items.map((item) => tab(item, "island"))}
      </nav>
    </>
  );
}

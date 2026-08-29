import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The signed-in creator's Profile ↔ Dashboard flip, shown only to the owner and
 * rendered identically at the top of BOTH their public profile
 * (/creators/{slug}) and their private dashboard (/me) so it reads as one
 * control. Navigational, not in-place: "Profile" is the public, indexed page;
 * "Dashboard" is the private, noindex one — keeping each on its own route is
 * deliberate (see the Profile/Dashboard decision), so a click navigates rather
 * than swapping content. Readers and non-owners never see it.
 *
 * `action` is an optional right-aligned slot (the profile uses it for the Edit
 * shortcut). Server component — just links.
 */
export function OwnerTabs({
  active,
  profileHref,
  profileLabel,
  dashboardLabel,
  action,
}: {
  active: "profile" | "dashboard";
  profileHref: string;
  profileLabel: string;
  dashboardLabel: string;
  action?: ReactNode;
}) {
  const tab = (label: string, href: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring -mb-px border-b-2 px-3 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none",
        isActive
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Your creator views" className="border-border border-b">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-2 px-6">
        <div className="flex gap-1">
          {tab(profileLabel, profileHref, active === "profile")}
          {tab(dashboardLabel, "/me", active === "dashboard")}
        </div>
        {action}
      </div>
    </nav>
  );
}

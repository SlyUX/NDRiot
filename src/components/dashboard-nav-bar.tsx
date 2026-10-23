import Link from "next/link";
import {
  Activity,
  Bookmark,
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  bunker: LayoutDashboard,
  activity: Activity,
  network: Users,
  saved: Bookmark,
  settings: SlidersHorizontal,
};

export interface DashboardNavItem {
  id: string;
  label: string;
}

/**
 * The dashboard's section nav rendered on the signed-in home as LINKS into the
 * dashboard (/me?view=<id>) — a quick launch that replaces the old "welcome
 * back" greeting + buttons. Shares the look of the in-place dashboard tabs, but
 * it navigates rather than swapping in place, so it's a plain server component.
 * Nothing is "active" here (you're on the home page, not inside a section).
 */
export function DashboardNavBar({ items }: { items: DashboardNavItem[] }) {
  return (
    // Content-width, boxed (pink border on all four edges), with a ~10px gap
    // above and below — a distinct launcher rather than a full-bleed strip.
    // px-6 on the outer, max-w on the inner — aligns with the page content.
    <div className="px-6">
      <nav
        aria-label="Your dashboard"
        className="border-primary/40 mx-auto my-2.5 flex max-w-[90rem] gap-1 overflow-x-auto border"
      >
        {items.map((item) => {
          const Icon = ICONS[item.id] ?? LayoutDashboard;
          return (
            <Link
              key={item.id}
              href={`/me?view=${item.id}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

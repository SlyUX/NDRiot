"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A "For Creators" funnel card. Desktop: the whole card links to its section
 * (icon, title, blurb). Mobile: a collapsed row — icon + title (still the link)
 * aligned, with a pink "+" that peeks the blurb — matching the Refusals' mobile
 * treatment so the funnel row doesn't run long on a phone. A stretched link
 * (after:inset-0) keeps the whole card tappable while the "+" sits above it.
 * Client leaf (§5) for the toggle; the icon arrives rendered so ForCreatorsRow
 * stays a Server Component.
 */
export function FeatureLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="group border-border relative flex h-full flex-col border p-5 transition-colors hover:border-primary md:p-6">
      <div className="flex items-center gap-3 md:block">
        {icon}
        <Link
          href={href}
          className="group-hover:text-primary focus-visible:ring-ring after:absolute after:inset-0 focus-visible:ring-2 focus-visible:outline-none md:mt-4 md:block"
        >
          <h3 className="text-sm font-black tracking-tight uppercase transition-colors md:text-lg">
            {title}
          </h3>
        </Link>
        {/* Mobile-only blurb toggle; sits above the stretched link (z-10) so a
            tap peeks the description instead of navigating. aria-label is a
            §2-exempt in-code string. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle details"
          className="relative z-10 ml-auto shrink-0 md:hidden"
        >
          <Plus
            aria-hidden="true"
            className={cn(
              "text-primary size-5 transition-transform",
              open && "rotate-45",
            )}
          />
        </button>
      </div>
      <p
        className={cn(
          "text-muted-foreground mt-2 text-sm md:block",
          !open && "hidden",
        )}
      >
        {description}
      </p>
    </li>
  );
}

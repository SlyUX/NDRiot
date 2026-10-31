"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One refusal. Desktop: a static stacked card (icon, title, statement). Mobile:
 * a collapsed row — icon + title aligned, with a pink "+" toggle (like the
 * mobile nav) that expands the statement — so the four of them don't bury the
 * mobile hero. The one interactive leaf of the otherwise-static Principles grid
 * (§5: 'use client' pushed to the smallest leaf). The icon arrives as a rendered
 * node so Principles can stay a Server Component.
 */
export function PrincipleCard({
  icon,
  title,
  description,
  surface,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  surface: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li
      className={cn(
        // Mobile: only vertical padding — the row sits inside the parent's
        // shared box, which owns the horizontal padding. sm+: the item gets its
        // own --surface-alt card (full padding) back; md+ it stacks.
        surface &&
          "py-5 sm:bg-surface-alt sm:border sm:border-border sm:p-5 md:flex md:h-full md:flex-col",
      )}
    >
      {/* The tap target is a mobile affordance; md+ it's inert and the row lays
          out as a stacked card header (icon above title, no toggle). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left md:pointer-events-none md:block"
      >
        {icon}
        <h3 className="text-foreground text-sm font-black tracking-wide uppercase md:mt-3">
          {title}
        </h3>
        <Plus
          aria-hidden="true"
          className={cn(
            "text-primary ml-auto size-5 shrink-0 transition-transform md:hidden",
            open && "rotate-45",
          )}
        />
      </button>
      <p
        className={cn(
          "text-muted-foreground mt-2 text-sm leading-relaxed md:block",
          !open && "hidden",
        )}
      >
        {description}
      </p>
    </li>
  );
}

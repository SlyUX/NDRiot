import { Shuffle, Scale, Equal, MegaphoneOff } from "lucide-react";

import type { FunnelCard } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

/**
 * The four refusals — no algorithm, no favoritism, no influencers, no ads — as
 * an inline grid of icon · title · statement. No band, no heading: it runs
 * inline inside the hero's identity strip (logged-out) and in the /about body,
 * reading as part of the surrounding copy rather than a separate section. The
 * site *behaves* these everywhere (§3: random hero, no ranking, visible
 * filters); this is where it states them. Copy is CMS-managed (§2); icons are
 * structural (fixed in code).
 *
 * `surface` boxes each item in a solid --surface-alt card — used over the hero
 * collage, where a consistent backdrop keeps the body copy legible against the
 * busy art. Off (the default) the items sit transparent, for a plain-background
 * reading column like /about.
 */
export function Principles({
  principles,
  columns = 4,
  surface = false,
}: {
  principles: {
    algorithm: FunnelCard;
    favoritism: FunnelCard;
    influencers: FunnelCard;
    ads: FunnelCard;
  };
  /** 4 across for a wide placement (the hero); 2 for a narrow reading column
   *  (the /about article). */
  columns?: 2 | 4;
  /** Box each item in a solid gray (--surface-alt) card — for legibility over
   *  the hero art. */
  surface?: boolean;
}) {
  // Token colors read on both surfaces this lands on: --foreground title and
  // --muted-foreground body stay legible over the hero's dark-washed art (the
  // hero rail already uses --muted-foreground there) and on the /about band;
  // the --primary icon is a graphic, clearing the 3:1 floor (§9).
  const items = [
    { key: "algorithm", Icon: Shuffle, card: principles.algorithm },
    { key: "favoritism", Icon: Scale, card: principles.favoritism },
    { key: "influencers", Icon: Equal, card: principles.influencers },
    { key: "ads", Icon: MegaphoneOff, card: principles.ads },
  ];

  return (
    <ul
      className={cn(
        "grid gap-x-6 gap-y-8 sm:grid-cols-2",
        columns === 4 && "lg:grid-cols-4",
      )}
    >
      {items.map(({ key, Icon, card }) => (
        <li
          key={key}
          className={cn(
            surface &&
              "bg-surface-alt border-border flex h-full flex-col border p-5",
          )}
        >
          <Icon
            aria-hidden="true"
            className="text-primary size-6"
            strokeWidth={1.75}
          />
          <h3 className="text-foreground mt-3 text-sm font-black tracking-wide uppercase">
            {card.title}
          </h3>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            {card.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

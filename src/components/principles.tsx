import { Shuffle, Scale, Equal, MegaphoneOff } from "lucide-react";

import { PrincipleCard } from "@/components/principle-card";
import type { FunnelCard } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

/**
 * The four refusals — no algorithm, no favoritism, no influencers, no ads — as
 * an inline grid of icon · title · statement. No band, no heading: it runs
 * inline inside the hero's identity strip (logged-out) and in the /about body,
 * reading as part of the surrounding copy rather than a separate section. The
 * site *behaves* these everywhere (§3: random hero, no ranking, visible
 * filters); this is where it states them. Copy is CMS-managed (§2); icons are
 * structural (fixed in code). Each card collapses to a tappable row on mobile
 * (PrincipleCard); desktop shows them in full.
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
  // --foreground title and --muted-foreground body read on both surfaces this
  // lands on (over the hero's dark-washed art and on the /about band); the
  // --primary icon is a graphic, clearing the 3:1 floor (§9).
  const iconClass = "text-primary size-6 shrink-0";
  const items = [
    {
      key: "algorithm",
      icon: <Shuffle aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: principles.algorithm,
    },
    {
      key: "favoritism",
      icon: <Scale aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: principles.favoritism,
    },
    {
      key: "influencers",
      icon: <Equal aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: principles.influencers,
    },
    {
      key: "ads",
      icon: (
        <MegaphoneOff aria-hidden="true" strokeWidth={1.75} className={iconClass} />
      ),
      card: principles.ads,
    },
  ];

  return (
    <ul
      className={cn(
        "grid gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-y-8",
        columns === 4 && "lg:grid-cols-4",
      )}
    >
      {items.map(({ key, icon, card }) => (
        <PrincipleCard
          key={key}
          icon={icon}
          title={card.title}
          description={card.description}
          surface={surface}
        />
      ))}
    </ul>
  );
}

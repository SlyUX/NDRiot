import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import type { RatingsAggregate } from "@/lib/ratings";
import { TABLE_COST_LEVELS } from "@/lib/taxonomy";

export interface ConventionRatingsLabels {
  heading: string;
  celebrityLabel: string;
  tableCostLabel: string;
  /** "{n}" is replaced with the rating count. */
  countLabel: string;
}

const COST_TITLE = Object.fromEntries(
  TABLE_COST_LEVELS.map((l) => [l.value, l.title]),
);

/** The most-reported table-cost band, as its title (ties join). */
function dominantCost(cost: {
  low: number;
  mid: number;
  high: number;
}): string {
  const max = Math.max(cost.low, cost.mid, cost.high);
  return (["low", "mid", "high"] as const)
    .filter((band) => cost[band] === max)
    .map((band) => COST_TITLE[band])
    .join(" / ");
}

/**
 * Aggregated creator ratings on a convention page — per-aspect averages only
 * (§3: never a composite score, never orders discovery), descriptive-flag
 * tallies, and attributed notes. Renders nothing until there's at least one
 * rating (the rate form invites the first).
 */
export function ConventionRatings({
  aggregate,
  labels,
}: {
  aggregate: RatingsAggregate;
  labels: ConventionRatingsLabels;
}) {
  if (aggregate.count === 0) return null;

  return (
    <section className="space-y-4">
      <SectionHeading as="h2" size="sm">
        {labels.heading}
      </SectionHeading>
      <p className="text-muted-foreground text-xs tracking-widest uppercase">
        {labels.countLabel.replace("{n}", String(aggregate.count))}
      </p>

      {aggregate.aspects.length > 0 && (
        <ul className="divide-border divide-y">
          {aggregate.aspects.map((aspect) => (
            <li
              key={aspect.code}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span>{aspect.label}</span>
              <span className="text-muted-foreground">
                <span className="text-foreground font-bold">
                  {aspect.avg.toFixed(1)}
                </span>{" "}
                / 5{" · "}
                {aspect.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(aggregate.celebrity || aggregate.tableCost) && (
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {aggregate.celebrity && (
            <span>
              {labels.celebrityLabel}: {aggregate.celebrity.yes}/
              {aggregate.celebrity.total}
            </span>
          )}
          {aggregate.tableCost && (
            <span>
              {labels.tableCostLabel}: {dominantCost(aggregate.tableCost)}
            </span>
          )}
        </div>
      )}

      {aggregate.notes.length > 0 && (
        <ul className="space-y-3">
          {aggregate.notes.map((note, i) => (
            <li key={i} className="text-sm">
              <p className="text-foreground/85">{note.text}</p>
              {note.slug ? (
                <Link
                  href={`/creators/${note.slug}`}
                  className="text-primary text-xs hover:underline"
                >
                  — {note.name}
                </Link>
              ) : (
                <span className="text-muted-foreground text-xs">
                  — {note.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

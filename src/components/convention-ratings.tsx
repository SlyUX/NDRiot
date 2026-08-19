import Link from "next/link";

import { RatingsEmptyNudge } from "@/components/ratings-empty-nudge";
import type { RatingsAggregate } from "@/lib/ratings";

export interface ConventionRatingsLabels {
  heading: string;
  /** Normal-weight note beside the heading, e.g. "(5 point scale)". */
  scaleNote: string;
  /** "{n}" is replaced with the rating count. */
  countLabel: string;
  /** Shown when there are no ratings. */
  empty: string;
}

/**
 * Aggregated creator ratings on a convention page — a tool for deciding which
 * cons are worth a table, never a leaderboard. §3: per-aspect averages only (no
 * composite score), and it never orders the directory. Benefit aspects show as
 * compact rectangles; notes are attributed blockquotes. Always visible — an
 * un-rated con shows an empty state that nudges a signed-out visitor to sign in
 * and be the first.
 */
export function ConventionRatings({
  aggregate,
  labels,
  signedIn,
  signInCopy,
}: {
  aggregate: RatingsAggregate;
  labels: ConventionRatingsLabels;
  signedIn: boolean;
  signInCopy: { title: string; body: string; cta: string };
}) {
  const empty = aggregate.count === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-lg font-black tracking-widest uppercase">
          {labels.heading}
        </h2>
        <span className="text-muted-foreground text-xs font-normal">
          {labels.scaleNote}
        </span>
      </div>

      {empty ? (
        signedIn ? (
          <p className="text-muted-foreground max-w-prose text-sm">
            {labels.empty}
          </p>
        ) : (
          <RatingsEmptyNudge text={labels.empty} signInCopy={signInCopy} />
        )
      ) : (
        <>
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            {labels.countLabel.replace("{n}", String(aggregate.count))}
          </p>

          {aggregate.aspects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aggregate.aspects.map((aspect) => (
                <span
                  key={aspect.code}
                  title={`${aspect.count}`}
                  className="border-border inline-flex items-center gap-2 border px-2.5 py-1 text-sm"
                >
                  <span>{aspect.label}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-bold">{aspect.avg.toFixed(1)}</span>
                </span>
              ))}
            </div>
          )}

          {aggregate.notes.length > 0 && (
            <div className="space-y-3">
              {aggregate.notes.map((note, i) => (
                <blockquote
                  key={i}
                  className="border-primary/40 border-l-2 pl-4"
                >
                  <p className="text-foreground/90 text-sm italic">
                    {note.text}
                  </p>
                  {note.slug ? (
                    <Link
                      href={`/creators/${note.slug}`}
                      className="text-primary mt-1 inline-block text-xs not-italic hover:underline"
                    >
                      — {note.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground mt-1 inline-block text-xs">
                      — {note.name}
                    </span>
                  )}
                </blockquote>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

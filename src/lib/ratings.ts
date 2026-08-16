import { CONVENTION_RATING_ASPECTS } from "@/lib/taxonomy";
import type { ConventionRatingRow } from "@/lib/types";

/**
 * Aggregate creator ratings of a convention for display.
 *
 * §3 (binding): per-aspect **averages only** — never a single composite score,
 * and this is never used to order the directory. It informs a creator deciding
 * where to table; it does not rank the venue. Descriptive flags are tallies, not
 * scores. Notes are attributed to their creator.
 */

type RawRating = ConventionRatingRow;

export type AspectAggregate = {
  code: string;
  label: string;
  avg: number;
  count: number;
};

export type RatingsAggregate = {
  count: number;
  aspects: AspectAggregate[];
  celebrity: { yes: number; total: number } | null;
  tableCost: { low: number; mid: number; high: number; total: number } | null;
  notes: { name: string; slug: string | null; text: string }[];
};

export function aggregateRatings(ratings: RawRating[]): RatingsAggregate {
  const aspects = CONVENTION_RATING_ASPECTS.map((aspect) => {
    const values = ratings
      .map((r) => r.benefits?.[aspect.code] ?? null)
      .filter((v): v is number => typeof v === "number");
    const avg = values.length
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
    return {
      code: aspect.code,
      label: aspect.label,
      avg,
      count: values.length,
    };
  }).filter((aspect) => aspect.count > 0);

  const celebVals = ratings
    .map((r) => r.celebrityFocused)
    .filter((v): v is boolean => typeof v === "boolean");
  const celebrity = celebVals.length
    ? { yes: celebVals.filter(Boolean).length, total: celebVals.length }
    : null;

  const costVals = ratings
    .map((r) => r.tableCost)
    .filter((v): v is "low" | "mid" | "high" => v != null);
  const tableCost = costVals.length
    ? {
        low: costVals.filter((v) => v === "low").length,
        mid: costVals.filter((v) => v === "mid").length,
        high: costVals.filter((v) => v === "high").length,
        total: costVals.length,
      }
    : null;

  const notes = ratings
    .filter((r) => r.note && r.note.trim())
    .map((r) => ({
      name: r.creatorName ?? "Creator",
      slug: r.creatorSlug ?? null,
      text: r.note!.trim(),
    }));

  return { count: ratings.length, aspects, celebrity, tableCost, notes };
}

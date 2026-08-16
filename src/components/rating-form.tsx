"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { removeVenueRating, setVenueRating } from "@/app/actions/ratings";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { CONVENTION_RATING_ASPECTS, TABLE_COST_LEVELS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

type Rating = {
  benefits?: Record<string, number | null> | null;
  celebrityFocused?: boolean | null;
  tableCost?: string | null;
  note?: string | null;
} | null;

export type RatingEligibleCreator = {
  id: string;
  name: string;
  rating: Rating;
};

export interface RatingFormLabels {
  heading: string;
  saveLabel: string;
  removeLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  celebrityLabel: string;
  tableCostLabel: string;
  noOpinion: string;
}

const field =
  "border border-white/20 bg-transparent px-3 py-2 text-sm focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none";

function benefitsFrom(rating: Rating): Record<string, string> {
  const out: Record<string, string> = {};
  for (const aspect of CONVENTION_RATING_ASPECTS) {
    const value = rating?.benefits?.[aspect.code];
    out[aspect.code] = typeof value === "number" ? String(value) : "";
  }
  return out;
}

const celebString = (v?: boolean | null) =>
  v === true ? "yes" : v === false ? "no" : "";

/**
 * A creator's rating of a convention, on the con page. Shown only to a creator
 * who's marked an appearance here (the action re-checks). Two layers: 1–5
 * benefit aspects (higher = better) + descriptive flags, plus an attributed
 * note. Prefilled from an existing rating; editable and removable.
 */
export function RatingForm({
  conventionId,
  creators,
  labels,
}: {
  conventionId: string;
  creators: RatingEligibleCreator[];
  labels: RatingFormLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const current = creators.find((c) => c.id === creatorId) ?? creators[0];
  const [benefits, setBenefits] = useState<Record<string, string>>(() =>
    benefitsFrom(current?.rating ?? null),
  );
  const [celebrity, setCelebrity] = useState(() =>
    celebString(current?.rating?.celebrityFocused),
  );
  const [tableCost, setTableCost] = useState(current?.rating?.tableCost ?? "");
  const [note, setNote] = useState(current?.rating?.note ?? "");

  function loadCreator(id: string) {
    setCreatorId(id);
    const rating = creators.find((c) => c.id === id)?.rating ?? null;
    setBenefits(benefitsFrom(rating));
    setCelebrity(celebString(rating?.celebrityFocused));
    setTableCost(rating?.tableCost ?? "");
    setNote(rating?.note ?? "");
    setError(null);
  }

  function save() {
    setError(null);
    const chosen: Record<string, number> = {};
    for (const aspect of CONVENTION_RATING_ASPECTS) {
      const n = Number(benefits[aspect.code]);
      if (n >= 1 && n <= 5) chosen[aspect.code] = n;
    }
    startTransition(async () => {
      const result = await setVenueRating({
        creatorId,
        conventionId,
        benefits: chosen,
        celebrityFocused:
          celebrity === "yes" ? true : celebrity === "no" ? false : null,
        tableCost: tableCost || null,
        note,
      });
      if (result.ok) router.refresh();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeVenueRating({ creatorId, conventionId });
      if (result.ok) {
        loadCreator(creatorId);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-border space-y-4 border p-5">
      <SectionHeading as="h2" size="sm">
        {labels.heading}
      </SectionHeading>

      {creators.length > 1 && (
        <select
          value={creatorId}
          onChange={(e) => loadCreator(e.target.value)}
          className={cn(field, "w-full appearance-none")}
          aria-label="Profile"
        >
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.name}
            </option>
          ))}
        </select>
      )}

      <div className="divide-border divide-y">
        {CONVENTION_RATING_ASPECTS.map((aspect) => (
          <label
            key={aspect.code}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span>{aspect.label}</span>
            <select
              value={benefits[aspect.code] ?? ""}
              onChange={(e) =>
                setBenefits((prev) => ({
                  ...prev,
                  [aspect.code]: e.target.value,
                }))
              }
              className={cn(field, "w-24 appearance-none")}
              aria-label={aspect.label}
            >
              <option value="">{labels.noOpinion}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          {labels.celebrityLabel}
          <select
            value={celebrity}
            onChange={(e) => setCelebrity(e.target.value)}
            className={cn(field, "appearance-none")}
            aria-label={labels.celebrityLabel}
          >
            <option value="">{labels.noOpinion}</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          {labels.tableCostLabel}
          <select
            value={tableCost}
            onChange={(e) => setTableCost(e.target.value)}
            className={cn(field, "appearance-none")}
            aria-label={labels.tableCostLabel}
          >
            <option value="">{labels.noOpinion}</option>
            {TABLE_COST_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="rating-note"
          className="block text-xs tracking-widest uppercase"
        >
          {labels.noteLabel}
        </label>
        <textarea
          id="rating-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={labels.notePlaceholder}
          rows={3}
          maxLength={600}
          className={cn(field, "w-full resize-y")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {labels.saveLabel}
        </Button>
        {current?.rating && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-destructive focus-visible:ring-ring text-xs font-bold tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {labels.removeLabel}
          </button>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { removeAppearance } from "@/app/actions/appearances";
import { AppearanceCard } from "@/components/appearance-card";
import { SectionHeading } from "@/components/section-heading";
import type { OwnedAppearance } from "@/lib/types";

export interface EventsManagerLabels {
  heading: string;
  empty: string;
  tablePrefix: string;
  tbaLabel: string;
  removeLabel: string;
}

/**
 * The creator's current convention appearances on the dashboard — the same
 * AppearanceCard the public profile uses, each with a Remove. Adding one lives
 * in the "Add an Event" modal (EventDialog); this is the read-and-remove list,
 * so it stays visible on the dashboard. Owner-gated — the remove action
 * re-checks ownership.
 */
export function EventsManager({
  current,
  labels,
}: {
  current: OwnedAppearance[];
  labels: EventsManagerLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(appearance: OwnedAppearance) {
    if (!appearance.creatorId || !appearance.venueId) return;
    setError(null);
    startTransition(async () => {
      const result = await removeAppearance({
        creatorId: appearance.creatorId,
        conventionId: appearance.venueId,
      });
      if (result.ok) router.refresh();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeading as="h2" size="sm" tone="personalize">
        {labels.heading}
      </SectionHeading>

      {current.length > 0 ? (
        <ul className="border-border divide-border divide-y border-t">
          {current.map((appearance) => (
            <AppearanceCard
              key={`${appearance.creatorId}-${appearance.venueId}`}
              venue={appearance.venue}
              status={appearance.status}
              tableNumber={appearance.tableNumber}
              note={appearance.note}
              forDate={appearance.forDate}
              tableLabel={labels.tablePrefix}
              tbaLabel={labels.tbaLabel}
              action={
                <button
                  type="button"
                  onClick={() => remove(appearance)}
                  disabled={pending}
                  className="text-primary focus-visible:ring-ring shrink-0 text-xs font-bold tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {labels.removeLabel}
                </button>
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{labels.empty}</p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

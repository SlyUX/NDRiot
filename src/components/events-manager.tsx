"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { removeAppearance } from "@/app/actions/appearances";
import { AppearanceCard } from "@/components/appearance-card";
import { EventDialog } from "@/components/event-dialog";
import type { EventAddFormLabels } from "@/components/event-add-form";
import { SectionHeading } from "@/components/section-heading";
import type { OwnedAppearance } from "@/lib/types";

export interface EventsManagerLabels {
  heading: string;
  empty: string;
  tablePrefix: string;
  tbaLabel: string;
  removeLabel: string;
  editLabel: string;
}

const iconButton =
  "text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex shrink-0 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60";

/**
 * The creator's current convention appearances on the dashboard — the same
 * AppearanceCard as the public profile, laid out as a scrolling row of cards,
 * each with an Edit (re-opens the form for that con) and a Remove (×). Adding a
 * new one lives in the "Add an Event" modal (the section-heading `action`).
 * Owner-gated — the remove/edit actions re-check ownership.
 */
export function EventsManager({
  current,
  labels,
  action,
  editForm,
}: {
  current: OwnedAppearance[];
  labels: EventsManagerLabels;
  /** Trailing control across from the heading — the "Add an Event" button. */
  action?: ReactNode;
  /** When present, each card gets an Edit that re-opens the form for that con. */
  editForm?: {
    creators: { id: string; name: string }[];
    labels: EventAddFormLabels;
  };
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
      <SectionHeading as="h2" size="sm" tone="dashboard" action={action}>
        {labels.heading}
      </SectionHeading>

      {current.length > 0 ? (
        <ul className="punk-scroll flex gap-4 overflow-x-auto pb-2">
          {current.map((appearance) => (
            <AppearanceCard
              key={`${appearance.creatorId}-${appearance.venueId}`}
              layout="card"
              venue={appearance.venue}
              status={appearance.status}
              tableNumber={appearance.tableNumber}
              note={appearance.note}
              forDate={appearance.forDate}
              tableLabel={labels.tablePrefix}
              tbaLabel={labels.tbaLabel}
              action={
                <span className="flex items-center gap-2">
                  {editForm && (
                    <EventDialog
                      creators={editForm.creators.filter(
                        (c) => c.id === appearance.creatorId,
                      )}
                      labels={{
                        ...editForm.labels,
                        addHeading: labels.editLabel,
                      }}
                      lockedConvention={{
                        id: appearance.venueId,
                        name: appearance.venue.name,
                      }}
                      existingByCreator={{
                        [appearance.creatorId]: {
                          status: appearance.status,
                          tableNumber: appearance.tableNumber,
                          note: appearance.note,
                        },
                      }}
                      trigger={
                        <button
                          type="button"
                          aria-label={labels.editLabel}
                          className={iconButton}
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </button>
                      }
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(appearance)}
                    disabled={pending}
                    aria-label={labels.removeLabel}
                    className={`${iconButton} text-lg leading-none`}
                  >
                    ×
                  </button>
                </span>
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

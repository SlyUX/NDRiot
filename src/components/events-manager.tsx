"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { removeAppearance, setAppearance } from "@/app/actions/appearances";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { APPEARANCE_STATUSES, appearanceStatusDisplay } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export type ManagerAppearance = {
  creatorId: string | null;
  creatorName: string | null;
  venueId: string | null;
  venueName: string | null;
  status: string | null;
  tableNumber?: string | null;
};

export interface EventsManagerLabels {
  heading: string;
  addHeading: string;
  empty: string;
  conventionLabel: string;
  tableFieldLabel: string;
  tablePrefix: string;
  saveLabel: string;
  removeLabel: string;
}

const field =
  "w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none";

/**
 * The creator's convention-appearance manager on the dashboard. Direct-write,
 * owner-gated (the server action re-checks) — pick a convention, mark attending
 * or tabling (+ a table number), and it lands on the profile and the con page.
 * Lists current appearances with a Remove. Multiple owned profiles get a picker.
 */
export function EventsManager({
  creators,
  conventions,
  current,
  labels,
}: {
  creators: { id: string; name: string }[];
  conventions: { id: string; name: string }[];
  current: ManagerAppearance[];
  labels: EventsManagerLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [conventionId, setConventionId] = useState("");
  const [status, setStatus] = useState("attending");
  const [tableNumber, setTableNumber] = useState("");

  function save() {
    setError(null);
    if (!conventionId) {
      setError("Pick a convention.");
      return;
    }
    startTransition(async () => {
      const result = await setAppearance({
        creatorId,
        conventionId,
        status,
        tableNumber,
      });
      if (result.ok) {
        setConventionId("");
        setTableNumber("");
        setStatus("attending");
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  function remove(appearance: ManagerAppearance) {
    if (!appearance.creatorId || !appearance.venueId) return;
    setError(null);
    startTransition(async () => {
      const result = await removeAppearance({
        creatorId: appearance.creatorId!,
        conventionId: appearance.venueId!,
      });
      if (result.ok) router.refresh();
      else setError(result.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeading as="h2" size="sm">
        {labels.heading}
      </SectionHeading>

      <div className="flex flex-col gap-6">
        {/* Current events — first on phones (order-1), after the form on desktop. */}
        <div className="order-1 md:order-2">
          {current.length > 0 ? (
            <ul className="border-border divide-border divide-y border-t">
              {current.map((appearance) => (
                <li
                  key={`${appearance.creatorId}-${appearance.venueId}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-bold">{appearance.venueName}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {appearanceStatusDisplay(appearance.status)}
                      {appearance.status === "tabling" && appearance.tableNumber
                        ? ` · ${labels.tablePrefix} ${appearance.tableNumber}`
                        : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(appearance)}
                    disabled={pending}
                    className="text-destructive focus-visible:ring-ring shrink-0 text-xs font-bold tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                  >
                    {labels.removeLabel}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          )}
        </div>

        {/* Add / update an event — after the list on phones (order-2), first on desktop. */}
        <div className="order-2 space-y-3 md:order-1">
          <SectionHeading as="h3" size="sm">
            {labels.addHeading}
          </SectionHeading>
          {creators.length > 1 && (
            <select
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              className={cn(field, "appearance-none")}
              aria-label="Profile"
            >
              {creators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={conventionId}
            onChange={(e) => setConventionId(e.target.value)}
            className={cn(field, "appearance-none")}
            aria-label={labels.conventionLabel}
          >
            <option value="">{labels.conventionLabel}…</option>
            {conventions.map((convention) => (
              <option key={convention.id} value={convention.id}>
                {convention.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-4">
            {APPEARANCE_STATUSES.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="appearance-status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  className="size-4 accent-[var(--primary)]"
                />
                {option.title}
              </label>
            ))}
          </div>
          {status === "tabling" && (
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder={labels.tableFieldLabel}
              aria-label={labels.tableFieldLabel}
              className={cn(field, "sm:max-w-xs")}
            />
          )}
          <Button
            type="button"
            onClick={save}
            disabled={pending || !conventionId}
          >
            {labels.saveLabel}
          </Button>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}

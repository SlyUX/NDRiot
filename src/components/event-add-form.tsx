"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { removeAppearance, setAppearance } from "@/app/actions/appearances";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { APPEARANCE_STATUSES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export interface EventAddFormLabels {
  addHeading: string;
  conventionLabel: string;
  tableFieldLabel: string;
  noteFieldLabel: string;
  saveLabel: string;
  /** Cancel/remove an existing appearance — e.g. "Cancel attendance". */
  removeLabel: string;
  /** Shown while saving — e.g. "Posting…". */
  postingLabel: string;
  /** Confirmation after a save — e.g. "Your event has posted." */
  postedLabel: string;
}

type ExistingAppearance = {
  status: string;
  tableNumber: string | null;
  note: string | null;
};

const field =
  "w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none";

/**
 * The add/update-an-appearance form — pick a convention, mark attending or
 * tabling (+ a table number), add an optional note. Direct-write, owner-gated
 * (the server action re-checks). Lives inside the "Add an Event" modal; the
 * dashboard shows the current list separately (EventsManager). Calls `onSaved`
 * on success so the dialog can close, then refreshes so the list updates.
 */
export function EventAddForm({
  creators,
  conventions,
  labels,
  onSaved,
  lockedConvention,
  existingByCreator,
}: {
  creators: { id: string; name: string }[];
  conventions: { id: string; name: string }[];
  labels: EventAddFormLabels;
  onSaved?: () => void;
  /** Fix the convention (the con page's "I'm Attending", or editing an event):
   *  the picker is replaced by its name. */
  lockedConvention?: { id: string; name: string };
  /** Which of `creators` already have an appearance at this con — prefills the
   *  form and offers Cancel. Keyed by creator id. */
  existingByCreator?: Record<string, ExistingAppearance>;
}) {
  const router = useRouter();
  const firstId = creators[0]?.id ?? "";
  const firstExisting = existingByCreator?.[firstId];
  const [pending, startTransition] = useTransition();
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState(firstId);
  const [conventionId, setConventionId] = useState(lockedConvention?.id ?? "");
  const [status, setStatus] = useState(firstExisting?.status ?? "attending");
  const [tableNumber, setTableNumber] = useState(
    firstExisting?.tableNumber ?? "",
  );
  const [note, setNote] = useState(firstExisting?.note ?? "");

  // When the profile changes, reload that creator's existing appearance (if any).
  function selectCreator(id: string) {
    setCreatorId(id);
    const existing = existingByCreator?.[id];
    setStatus(existing?.status ?? "attending");
    setTableNumber(existing?.tableNumber ?? "");
    setNote(existing?.note ?? "");
    setError(null);
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAppearance({ creatorId, conventionId });
      if (result.ok) {
        router.refresh();
        onSaved?.();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

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
        note,
      });
      if (result.ok) {
        router.refresh();
        // Hold the confirmation for a beat, then close the modal.
        setPosted(true);
        setTimeout(() => onSaved?.(), 2000);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  // Saving / saved swaps the form for a status line (the modal then closes).
  if (pending || posted) {
    return (
      <div className="space-y-3">
        <SectionHeading as="h2" size="sm">
          {labels.addHeading}
        </SectionHeading>
        <div className="py-8" role="status" aria-live="polite">
          <p className="text-funding text-lg font-black tracking-wide uppercase">
            {posted ? labels.postedLabel : labels.postingLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeading as="h2" size="sm">
        {labels.addHeading}
      </SectionHeading>
      {creators.length > 1 && (
        <select
          value={creatorId}
          onChange={(e) => selectCreator(e.target.value)}
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
      {lockedConvention ? (
        <p className="border border-white/20 px-3 py-2 text-sm font-bold">
          {lockedConvention.name}
        </p>
      ) : (
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
      )}
      <div className="flex flex-wrap gap-4">
        {APPEARANCE_STATUSES.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
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
      {/* An optional short line shown on the appearance card (~100 chars). */}
      <input
        type="text"
        value={note}
        maxLength={100}
        onChange={(e) => setNote(e.target.value)}
        placeholder={labels.noteFieldLabel}
        aria-label={labels.noteFieldLabel}
        className={field}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={pending || !conventionId}
        >
          {labels.saveLabel}
        </Button>
        {/* Cancel/remove is offered once this profile already has an appearance
            here — it takes them off the convention's creator list. */}
        {existingByCreator?.[creatorId] && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-primary focus-visible:ring-ring text-xs font-bold tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {labels.removeLabel}
          </button>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setAppearance } from "@/app/actions/appearances";
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
  /** Shown while saving — e.g. "Posting…". */
  postingLabel: string;
  /** Confirmation after a save — e.g. "Your event has posted." */
  postedLabel: string;
}

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
}: {
  creators: { id: string; name: string }[];
  conventions: { id: string; name: string }[];
  labels: EventAddFormLabels;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [conventionId, setConventionId] = useState("");
  const [status, setStatus] = useState("attending");
  const [tableNumber, setTableNumber] = useState("");
  const [note, setNote] = useState("");

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
      <Button type="button" onClick={save} disabled={pending || !conventionId}>
        {labels.saveLabel}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

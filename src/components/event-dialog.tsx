"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Plus } from "lucide-react";

import {
  EventAddForm,
  type EventAddFormLabels,
} from "@/components/event-add-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The add/edit-appearance form in a modal. Its trigger varies by context — the
 * dashboard's "Add an Event", a per-event "Edit", or a convention page's "I'm
 * Attending" (which locks the convention). Controlled so a successful save
 * closes it; the list refreshes from the server action's revalidate.
 *
 * The label-button trigger is built HERE, inside this client component, via the
 * `trigger*` props. A Server Component must NOT pass a built element — a
 * Server-built element handed to `<DialogTrigger asChild>` (Radix Slot)
 * intermittently throws "failed to slot onto its children" across the RSC
 * boundary (radix-ui#4150). The `trigger` element prop remains only for
 * client-rendered callers (e.g. the icon-only edit chip in EventsManager).
 */
export function EventDialog({
  creators,
  conventions = [],
  labels,
  lockedConvention,
  existingByCreator,
  trigger,
  triggerLabel,
  fullWidthTrigger = false,
  triggerSize,
  triggerIcon = true,
}: {
  creators: { id: string; name: string }[];
  conventions?: { id: string; name: string }[];
  labels: EventAddFormLabels;
  lockedConvention?: { id: string; name: string };
  existingByCreator?: Record<
    string,
    { status: string; tableNumber: string | null; note: string | null }
  >;
  /** A CLIENT-built element (asChild) — e.g. EventsManager's edit chip. Server
      callers must use the `trigger*` props below instead (radix-ui#4150). */
  trigger?: ReactNode;
  /** Trigger button label. Defaults to the dialog heading. */
  triggerLabel?: string;
  /** Stretch the trigger full-width (the dashboard Events tab). */
  fullWidthTrigger?: boolean;
  /** Larger trigger (a convention page's "I'm Attending"). */
  triggerSize?: "lg";
  /** Show the leading "+" icon. Default true; off for the attending button. */
  triggerIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="inverse"
            size={triggerSize}
            className={cn(
              "font-black tracking-wide uppercase",
              fullWidthTrigger && "w-full",
            )}
          >
            {triggerIcon && <Plus aria-hidden="true" className="size-4" />}
            {triggerLabel ?? labels.addHeading}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle className="sr-only">{labels.addHeading}</DialogTitle>
        <EventAddForm
          creators={creators}
          conventions={conventions}
          labels={labels}
          lockedConvention={lockedConvention}
          existingByCreator={existingByCreator}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

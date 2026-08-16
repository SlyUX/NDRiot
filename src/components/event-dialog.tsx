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

/**
 * The add/edit-appearance form in a modal. Its trigger varies by context — the
 * dashboard's "Add an Event", a per-event "Edit", or a convention page's "I'm
 * Attending" (which locks the convention). Controlled so a successful save
 * closes it; the list refreshes from the server action's revalidate.
 */
export function EventDialog({
  creators,
  conventions = [],
  labels,
  lockedConvention,
  initial,
  trigger,
}: {
  creators: { id: string; name: string }[];
  conventions?: { id: string; name: string }[];
  labels: EventAddFormLabels;
  lockedConvention?: { id: string; name: string };
  initial?: {
    creatorId?: string;
    status?: string;
    tableNumber?: string | null;
    note?: string | null;
  };
  /** The clickable element (asChild). Defaults to the "+ Add an Event" button. */
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="inverse"
            className="font-black tracking-wide uppercase"
          >
            <Plus aria-hidden="true" className="size-4" />
            {labels.addHeading}
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
          initial={initial}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

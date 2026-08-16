"use client";

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
 * "Add an Event" as a modal — the trigger sits under the creator's "Post an
 * Update" button, and the add-appearance form opens in a dialog (mirroring
 * PostUpdateDialog). Controlled so a successful save closes it; the dashboard's
 * "Your Events" list refreshes from the server action's revalidate.
 */
export function EventDialog({
  creators,
  conventions,
  labels,
}: {
  creators: { id: string; name: string }[];
  conventions: { id: string; name: string }[];
  labels: EventAddFormLabels;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-center font-black tracking-wide uppercase"
        >
          <Plus aria-hidden="true" className="size-4" />
          {labels.addHeading}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle className="sr-only">{labels.addHeading}</DialogTitle>
        <EventAddForm
          creators={creators}
          conventions={conventions}
          labels={labels}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EventDialog } from "@/components/event-dialog";
import { PostUpdateDialog } from "@/components/post-update-dialog";
import { StripComposer } from "@/components/strip-composer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Reuse each dialog's own prop shape — no duplicate type lists (§7). Each menu
// item drives its dialog in controlled mode; Comic is a route, not a dialog.
type UpdateProps = Pick<
  React.ComponentProps<typeof PostUpdateDialog>,
  "targets" | "kinds" | "mentions" | "labels"
>;
type EventProps = Pick<
  React.ComponentProps<typeof EventDialog>,
  "creators" | "conventions" | "labels"
>;
type StripProps = Pick<
  React.ComponentProps<typeof StripComposer>,
  "copy" | "common" | "reviewNotice" | "creator" | "series"
>;

type OpenKind = "update" | "event" | "strip" | null;

/**
 * The Bunker "+ Create" menu — one entry point for the four creator actions
 * (previously four buttons scattered across the Events/Comics/Activity tabs).
 * Three open a dialog in place (Update, Event, Strip); Comic routes to the full
 * intake form. The dialogs render triggerless + controlled here, so the menu
 * owns their open state; their own triggers are gone from the tabs.
 */
export function BunkerCreateMenu({
  createLabel,
  itemLabels,
  comicHref,
  update,
  event,
  strip,
}: {
  createLabel: string;
  itemLabels: { update: string; event: string; comic: string; strip: string };
  comicHref: string;
  update: UpdateProps;
  event: EventProps;
  strip: StripProps;
}) {
  const [open, setOpen] = useState<OpenKind>(null);
  const closer = (kind: Exclude<OpenKind, null>) => (next: boolean) =>
    setOpen(next ? kind : null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="inverse"
            className="font-black tracking-wide uppercase"
          >
            <Plus aria-hidden="true" className="size-4" />
            {createLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setOpen("update")}>
            {itemLabels.update}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("event")}>
            {itemLabels.event}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={comicHref}>{itemLabels.comic}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("strip")}>
            {itemLabels.strip}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PostUpdateDialog
        {...update}
        hideTrigger
        open={open === "update"}
        onOpenChange={closer("update")}
      />
      <EventDialog
        {...event}
        hideTrigger
        open={open === "event"}
        onOpenChange={closer("event")}
      />
      <StripComposer
        {...strip}
        hideTrigger
        open={open === "strip"}
        onOpenChange={closer("strip")}
      />
    </>
  );
}

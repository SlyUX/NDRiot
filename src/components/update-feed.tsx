import type { ReactNode } from "react";

import { SectionHeading } from "@/components/section-heading";
import { UpdateItemContent } from "@/components/update-item-content";
import { UpdateRow, type UpdateOwnerConfig } from "@/components/update-row";
import type { UpdateFeedItem } from "@/lib/types";

/**
 * An update feed, newest first — pure recency, never ranked or counted (§3).
 * Read-only by default (the reader's /me "Your Feed", a creator's public
 * profile). When `owner` labels are passed — the dashboard's "Your Updates" —
 * each update becomes an interactive row with an edit + delete/undo. A creator's
 * own updates are only editable there, never on the public profile.
 */
export function UpdateFeed({
  heading,
  headingTone,
  emptyLabel,
  updates,
  owner,
  scrollCap = false,
  action,
}: {
  /** Omit inside a tabbed panel, where the tab label is the heading. */
  heading?: string;
  /** Teal on the personalized dashboard ("Your Feed"); default on a public profile. */
  headingTone?: "default" | "primary" | "personalize";
  emptyLabel: string;
  updates: UpdateFeedItem[];
  /** Present only when the viewer owns these updates — enables edit + delete/undo. */
  owner?: UpdateOwnerConfig;
  /**
   * Cap the list at 450px and scroll the overflow (the dashboard's Your Feed /
   * Your Updates columns), with the same persistent pink scrollbar as the hero
   * rail. The heading stays fixed above the scroll region.
   */
  scrollCap?: boolean;
  /** Trailing element beside the heading — e.g. the owner's "manage on your dashboard" link on the profile. */
  action?: ReactNode;
}) {
  const list = (
    <ul className="border-border divide-border divide-y border-t">
      {updates.map((update) =>
        owner ? (
          <UpdateRow key={update._id} update={update} config={owner} />
        ) : (
          <li key={update._id} className="py-4">
            <UpdateItemContent update={update} />
          </li>
        ),
      )}
    </ul>
  );

  return (
    <div>
      {heading && (
        <SectionHeading as="h2" size="sm" tone={headingTone} action={action}>
          {heading}
        </SectionHeading>
      )}
      {updates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : scrollCap ? (
        <div className="punk-scroll max-h-[450px] overflow-y-auto pr-2">
          {list}
        </div>
      ) : (
        list
      )}
    </div>
  );
}

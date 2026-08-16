import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { DateTile } from "@/components/date-tile";
import { formatPlace } from "@/lib/place";
import { appearanceStatusDisplay } from "@/lib/taxonomy";
import { externalHref } from "@/lib/utils";

/**
 * One convention appearance as a horizontal card — a pink date tile where a
 * thumbnail would sit, then the convention, the status on its own line, the
 * location, and the creator's note. Shared by the public profile (CreatorEvents)
 * and the dashboard (EventsManager, which passes a Remove via `action`).
 */
type AppearanceVenue = {
  name: string;
  slug: string;
  website: string | null;
  startDate: string | null;
  endDate: string | null;
  place: Parameters<typeof formatPlace>[0];
};

export function AppearanceCard({
  venue,
  status,
  tableNumber,
  note,
  forDate,
  tableLabel,
  tbaLabel,
  action,
}: {
  venue: AppearanceVenue;
  status: string | null;
  tableNumber?: string | null;
  note?: string | null;
  forDate?: string | null;
  tableLabel: string;
  tbaLabel: string;
  /** Trailing control on the name row — e.g. the dashboard's Remove. */
  action?: ReactNode;
}) {
  const where = formatPlace(venue.place);
  // The tile shows the occurrence's start; forDate is the stamped fallback.
  const tileDate = venue.startDate ?? forDate ?? null;

  return (
    <li className="flex gap-4 py-4">
      <DateTile date={tileDate} tbaLabel={tbaLabel} className="w-20 sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-x-3">
          <Link
            href={`/conventions/${venue.slug}`}
            className="hover:text-primary font-bold transition-colors"
          >
            {venue.name}
          </Link>
          {(venue.website || action) && (
            <span className="text-muted-foreground ml-auto flex items-center gap-3">
              {venue.website && (
                <a
                  href={externalHref(venue.website)}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  aria-label={`${venue.name} website`}
                  className="hover:text-primary inline-flex transition-colors"
                >
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              )}
              {action}
            </span>
          )}
        </div>
        {/* Status (and table) on their own line under the convention name. */}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
          <span className="bg-card text-primary px-1.5 py-0.5 font-black tracking-widest uppercase">
            {appearanceStatusDisplay(status)}
          </span>
          {status === "tabling" && tableNumber && (
            <span className="text-muted-foreground">
              {tableLabel} {tableNumber}
            </span>
          )}
        </p>
        {where && (
          <p className="text-primary mt-1 text-xs tracking-wide uppercase">
            {where}
          </p>
        )}
        {note && (
          <p className="text-muted-foreground mt-1 text-sm">{note}</p>
        )}
      </div>
    </li>
  );
}

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { DateTile } from "@/components/date-tile";
import { SectionHeading } from "@/components/section-heading";
import { isUpcomingDate } from "@/lib/conventions";
import { formatPlace } from "@/lib/place";
import { appearanceStatusDisplay } from "@/lib/taxonomy";
import { externalHref } from "@/lib/utils";
import type { CreatorAppearance } from "@/lib/types";

/**
 * A creator's upcoming convention appearances — the "Events" row on their
 * profile. Upcoming only (a marker whose occurrence has passed auto-expires,
 * §appearances), soonest first; dates-TBA markers sort last. Renders nothing
 * when there's nothing upcoming, so the section only appears when it has content.
 *
 * Each appearance is a horizontal card: a pink date tile where a thumbnail would
 * sit, then the convention, status, location, and the creator's own short note.
 * The convention's own site is the source of truth for specifics, so each row
 * carries a link-out to it (§3-clean — a link, not a signal).
 */
export function CreatorEvents({
  appearances,
  heading,
  tableLabel,
  tbaLabel,
}: {
  appearances: CreatorAppearance[];
  heading: string;
  tableLabel: string;
  /** CMS "dates TBA" copy for the date tile when an appearance has no date. */
  tbaLabel: string;
}) {
  const upcoming = appearances
    .filter((a) => a.venue && isUpcomingDate(a.forDate))
    .sort((a, b) =>
      (a.forDate ?? "9999-99-99").localeCompare(b.forDate ?? "9999-99-99"),
    );

  if (upcoming.length === 0) return null;

  return (
    <div>
      <SectionHeading as="h2" size="sm">
        {heading}
      </SectionHeading>
      <ul className="border-border divide-border divide-y border-t">
        {upcoming.map((appearance, i) => {
          const venue = appearance.venue!;
          const where = formatPlace(venue.place);
          // The tile shows the occurrence's start; forDate is the stamped fallback.
          const tileDate = venue.startDate ?? appearance.forDate ?? null;
          return (
            <li key={`${venue._id}-${i}`} className="flex gap-4 py-4">
              <DateTile
                date={tileDate}
                tbaLabel={tbaLabel}
                className="w-20 sm:w-24"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <Link
                    href={`/conventions/${venue.slug}`}
                    className="hover:text-primary font-bold transition-colors"
                  >
                    {venue.name}
                  </Link>
                  <span className="bg-card text-primary px-1.5 py-0.5 text-xs font-black tracking-widest uppercase">
                    {appearanceStatusDisplay(appearance.status)}
                  </span>
                  {appearance.status === "tabling" && appearance.tableNumber && (
                    <span className="text-muted-foreground text-xs">
                      {tableLabel} {appearance.tableNumber}
                    </span>
                  )}
                  {venue.website && (
                    <a
                      href={externalHref(venue.website)}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      aria-label={`${venue.name} website`}
                      className="text-muted-foreground hover:text-primary ml-auto inline-flex transition-colors"
                    >
                      <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </a>
                  )}
                </div>
                {where && (
                  <p className="text-primary mt-1 text-xs tracking-wide uppercase">
                    {where}
                  </p>
                )}
                {appearance.note && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {appearance.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

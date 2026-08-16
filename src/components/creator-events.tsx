import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { formatOccurrence, isUpcomingDate } from "@/lib/conventions";
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
 * The convention's own site is the source of truth for specifics, so each row
 * carries a link-out to it (§3-clean — a link, not a signal).
 */
export function CreatorEvents({
  appearances,
  heading,
  tableLabel,
}: {
  appearances: CreatorAppearance[];
  heading: string;
  tableLabel: string;
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
          const when =
            formatOccurrence(venue.startDate, venue.endDate) ??
            formatOccurrence(appearance.forDate);
          const where = formatPlace(venue.place);
          const meta = [when, where].filter(Boolean).join(" · ");
          return (
            <li
              key={`${venue._id}-${i}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-sm"
            >
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
              <span className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
                {meta}
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
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { AppearanceCard } from "@/components/appearance-card";
import { SectionHeading } from "@/components/section-heading";
import { isUpcomingDate } from "@/lib/conventions";
import type { CreatorAppearance } from "@/lib/types";

/**
 * A creator's upcoming convention appearances — the "Events" row on their
 * profile. Upcoming only (a marker whose occurrence has passed auto-expires,
 * §appearances), soonest first; dates-TBA markers sort last. Renders nothing
 * when there's nothing upcoming, so the section only appears when it has content.
 *
 * Each appearance is an AppearanceCard (shared with the dashboard) — a pink date
 * tile, the convention, status on its own line, location, and note.
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
        {upcoming.map((appearance, i) => (
          <AppearanceCard
            key={`${appearance.venue!._id}-${i}`}
            venue={appearance.venue!}
            status={appearance.status}
            tableNumber={appearance.tableNumber}
            note={appearance.note}
            forDate={appearance.forDate}
            tableLabel={tableLabel}
            tbaLabel={tbaLabel}
          />
        ))}
      </ul>
    </div>
  );
}

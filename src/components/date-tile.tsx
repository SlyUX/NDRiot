import { cn } from "@/lib/utils";

/**
 * A square date "tile" that stands in for a thumbnail on appearance cards —
 * month, day, year stacked on ND Riot pink. Black text on the pink (§9,
 * --primary-foreground, 5.69:1 AA); white on #FF0095 fails, so the tile stays
 * the vivid pink with black type rather than washing it.
 *
 * A dateless ("dates TBA") appearance shows the TBA label instead — the caller
 * passes it (CMS copy, §2).
 */
export function DateTile({
  date,
  tbaLabel,
  className,
}: {
  /** ISO calendar date ("2026-08-17") or null for a dates-TBA appearance. */
  date: string | null;
  tbaLabel: string;
  className?: string;
}) {
  // Parse at UTC noon so the calendar day never shifts across time zones.
  const parsed = date ? new Date(`${date.slice(0, 10)}T12:00:00Z`) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime());
  const month = valid
    ? parsed!.toLocaleString("en-US", { month: "long", timeZone: "UTC" })
    : "";
  const day = valid ? parsed!.getUTCDate() : "";
  const year = valid ? parsed!.getUTCFullYear() : "";

  return (
    <div
      className={cn(
        "bg-primary text-primary-foreground aspect-square shrink-0 overflow-hidden",
        className,
      )}
    >
      <div className="flex h-full flex-col items-center justify-center p-2 text-center">
        {valid ? (
          <>
            <span className="text-[0.65rem] leading-none font-black tracking-widest uppercase sm:text-xs">
              {month}
            </span>
            <span className="text-3xl leading-none font-black sm:text-4xl">
              {day}
            </span>
            <span className="text-[0.65rem] leading-none font-bold sm:text-xs">
              {year}
            </span>
          </>
        ) : (
          <span className="text-sm font-black tracking-wide uppercase">
            {tbaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

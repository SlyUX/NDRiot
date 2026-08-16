import { cn } from "@/lib/utils";

/**
 * A square date "tile" that stands in for a thumbnail on appearance cards —
 * month, day, year stacked on ND Riot pink. White on raw #FF0095 fails AA (§9,
 * 3.69:1), so the pink carries the house black wash (the hero / Your Comics
 * technique): a bg-black/60 overlay darkens the pink enough that white clears AA
 * on every line, including the small month/year.
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
        "bg-primary relative aspect-square shrink-0 overflow-hidden",
        className,
      )}
    >
      {/* Black wash so white text clears AA on the pink (§9). */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative flex h-full flex-col items-center justify-center p-2 text-center text-white">
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

/**
 * Format a structured `place` (city + US-state region + country) for display,
 * falling back to the legacy free-text `location` string while docs are being
 * backfilled. Region-level by design (privacy) — never a precise address.
 *
 * "Seattle, WA" · "WA" · "Seattle" · a non-US country · or the legacy string.
 */
export type Place = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export function formatPlace(
  place?: Place | null,
  legacy?: string | null,
): string | null {
  if (place) {
    const parts = [place.city, place.region].filter(Boolean);
    if (parts.length) return parts.join(", ");
    // No city/region but a non-default country — show it rather than nothing.
    if (place.country && place.country !== "United States")
      return place.country;
  }
  return legacy ?? null;
}

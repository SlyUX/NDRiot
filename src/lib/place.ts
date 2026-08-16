/**
 * Format a structured `place` (city + US-state region + country) for display.
 * Region-level by design (privacy) — never a precise address.
 *
 * "Seattle, WA" · "WA" · "Seattle" · a non-US country · or null.
 */
export type Place = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export function formatPlace(place?: Place | null): string | null {
  if (!place) return null;
  const parts = [place.city, place.region].filter(Boolean);
  if (parts.length) return parts.join(", ");
  // No city/region but a non-default country — show it rather than nothing.
  if (place.country && place.country !== "United States") return place.country;
  return null;
}

"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { CONVENTION_RATING_ASPECTS, TABLE_COST_LEVELS } from "@/lib/taxonomy";
import { ownsCreator } from "@/sanity/ownership-client";
import { getWriteClient } from "@/sanity/write-client";

/**
 * A creator's rating of a convention (later: comic shops). Owner-gated AND
 * appearance-gated — you can only rate a venue you've marked attending/tabling.
 * Its own document at a deterministic id (one per creator per venue).
 *
 * §3: informs, never orders discovery — enforced at display, not here. Write
 * path — prod/preview only (needs SANITY_WRITE_TOKEN).
 */

export type RatingResult = { ok: boolean; error?: string };

const ASPECT_CODES = CONVENTION_RATING_ASPECTS.map(
  (a) => a.code,
) as readonly string[];
const COST_VALUES = TABLE_COST_LEVELS.map((l) => l.value) as readonly string[];

function ratingId(creatorId: string, venueId: string): string {
  return `rating-${creatorId}-${venueId}`.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function setVenueRating(input: {
  creatorId: string;
  conventionId: string;
  benefits?: Record<string, number>;
  celebrityFocused?: boolean | null;
  tableCost?: string | null;
  note?: string;
}): Promise<RatingResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, error: "Sign in to rate." };
  if (!input.creatorId || !input.conventionId)
    return { ok: false, error: "Missing details." };
  if (!(await ownsCreator(email, input.creatorId))) {
    return { ok: false, error: "You can only rate as a profile you own." };
  }

  const client = getWriteClient();
  // Appearance-gated — integrity: rate only cons you've actually marked.
  const attended = await client
    .fetch<number>(
      `count(*[_type=="conventionAppearance" && creator._ref==$c && venue._ref==$v])`,
      { c: input.creatorId, v: input.conventionId },
    )
    .catch(() => 0);
  if (!attended) {
    return {
      ok: false,
      error: "Mark that you attended this convention before rating it.",
    };
  }

  // Keep only known aspects, as 1–5 integers.
  const benefits: Record<string, number> = {};
  for (const code of ASPECT_CODES) {
    const value = input.benefits?.[code];
    if (typeof value === "number" && value >= 1 && value <= 5)
      benefits[code] = Math.round(value);
  }
  const tableCost =
    input.tableCost && COST_VALUES.includes(input.tableCost)
      ? input.tableCost
      : undefined;
  const note = input.note?.trim().slice(0, 600) || undefined;

  try {
    await client.createOrReplace({
      _id: ratingId(input.creatorId, input.conventionId),
      _type: "venueRating",
      creator: { _type: "reference", _ref: input.creatorId },
      target: { _type: "reference", _ref: input.conventionId },
      ...(Object.keys(benefits).length ? { benefits } : {}),
      ...(typeof input.celebrityFocused === "boolean"
        ? { celebrityFocused: input.celebrityFocused }
        : {}),
      ...(tableCost ? { tableCost } : {}),
      ...(note ? { note } : {}),
    });
  } catch (cause) {
    console.error("[ratings] set failed", cause);
    return { ok: false, error: "Could not save — please try again." };
  }
  revalidatePath("/conventions/[slug]", "page");
  return { ok: true };
}

export async function removeVenueRating(input: {
  creatorId: string;
  conventionId: string;
}): Promise<RatingResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, error: "Sign in first." };
  if (!(await ownsCreator(email, input.creatorId))) {
    return { ok: false, error: "You can only manage your own rating." };
  }
  try {
    await getWriteClient().delete(
      ratingId(input.creatorId, input.conventionId),
    );
  } catch (cause) {
    console.error("[ratings] remove failed", cause);
    return { ok: false, error: "Could not remove — please try again." };
  }
  revalidatePath("/conventions/[slug]", "page");
  return { ok: true };
}

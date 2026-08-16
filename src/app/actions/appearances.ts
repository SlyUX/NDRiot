"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { APPEARANCE_STATUSES } from "@/lib/taxonomy";
import { ownsCreator } from "@/sanity/ownership-client";
import { getWriteClient } from "@/sanity/write-client";

/**
 * Manage a creator's convention appearances (attending / tabling) from their
 * dashboard. Direct-write, owner-gated — not the reviewed intake queue, since
 * "I'm going / not going" changes often. Each appearance is its own document at
 * a deterministic id, so it's a clean createOrReplace (one per creator per con)
 * and can't be clobbered by a profile-edit draft.
 *
 * The write path needs SANITY_WRITE_TOKEN (prod/preview only, absent locally).
 */

export type AppearanceResult = { ok: boolean; error?: string };

const STATUS_VALUES = APPEARANCE_STATUSES.map(
  (s) => s.value,
) as readonly string[];

/** Deterministic id → one appearance per (creator, venue), editable in place. */
function appearanceId(creatorId: string, venueId: string): string {
  return `appearance-${creatorId}-${venueId}`.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function guard(creatorId: string): Promise<AppearanceResult | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, error: "Sign in to manage your events." };
  if (!creatorId) return { ok: false, error: "Missing creator." };
  if (!(await ownsCreator(email, creatorId))) {
    return {
      ok: false,
      error: "You can only manage events for a profile you own.",
    };
  }
  return null;
}

function revalidate() {
  revalidatePath("/me");
  revalidatePath("/creators/[slug]", "page");
  revalidatePath("/conventions/[slug]", "page");
}

/** Add or update an appearance. Stamps forDate from the con's current start date. */
export async function setAppearance(input: {
  creatorId: string;
  conventionId: string;
  status: string;
  tableNumber?: string;
  note?: string;
}): Promise<AppearanceResult> {
  const denied = await guard(input.creatorId);
  if (denied) return denied;
  if (!input.conventionId) return { ok: false, error: "Pick a convention." };

  const status = STATUS_VALUES.includes(input.status)
    ? input.status
    : "attending";
  const table =
    status === "tabling"
      ? input.tableNumber?.trim().slice(0, 40) || undefined
      : undefined;
  const note = input.note?.trim().slice(0, 100) || undefined;
  const client = getWriteClient();

  // Stamp the occurrence date so a marker for a past show auto-expires. Best
  // effort — a con with no date yet just yields a dateless (TBA) appearance.
  let forDate: string | undefined;
  try {
    const con = await client.fetch<{ startDate: string | null } | null>(
      `*[_type=="convention" && _id==$id][0]{startDate}`,
      { id: input.conventionId },
    );
    forDate = con?.startDate ?? undefined;
  } catch (cause) {
    console.error("[appearances] con date read failed", cause);
  }

  try {
    await client.createOrReplace({
      _id: appearanceId(input.creatorId, input.conventionId),
      _type: "conventionAppearance",
      creator: { _type: "reference", _ref: input.creatorId },
      venue: { _type: "reference", _ref: input.conventionId },
      status,
      ...(table ? { tableNumber: table } : {}),
      ...(note ? { note } : {}),
      ...(forDate ? { forDate } : {}),
    });
  } catch (cause) {
    console.error("[appearances] set failed", cause);
    return { ok: false, error: "Could not save — please try again." };
  }
  revalidate();
  return { ok: true };
}

/** Remove an appearance. */
export async function removeAppearance(input: {
  creatorId: string;
  conventionId: string;
}): Promise<AppearanceResult> {
  const denied = await guard(input.creatorId);
  if (denied) return denied;
  try {
    await getWriteClient().delete(
      appearanceId(input.creatorId, input.conventionId),
    );
  } catch (cause) {
    console.error("[appearances] remove failed", cause);
    return { ok: false, error: "Could not remove — please try again." };
  }
  revalidate();
  return { ok: true };
}

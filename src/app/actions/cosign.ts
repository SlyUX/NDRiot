"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import { getWriteClient } from "@/sanity/write-client";

/**
 * Cosigns — a creator's PUBLIC endorsement of another creator. Adds/removes the
 * target as an on-site entry in the endorser's own `favoriteCreators` (shown as
 * "{name}'s Cosigns" on their profile). Distinct from the private reader Save:
 * Save is a private shelf any reader keeps; a Cosign is a public, creators-only
 * vouch. §3-safe — an explicit editorial endorsement, never aggregated into
 * "most-cosigned" or any ranking.
 *
 * Owner-gated: you only ever edit your OWN list. Direct write to the endorser's
 * published doc (the owner curating their own list — no review needed, unlike
 * intake). Read-modify-write so existing off-site favorites are preserved.
 * Prod/preview only (needs SANITY_WRITE_TOKEN).
 */

export type CosignResult = { ok: boolean; cosigned?: boolean; error?: string };

type FavoriteItem = {
  _key: string;
  _type: string;
  onSite?: { _type?: string; _ref?: string } | null;
  name?: string | null;
  url?: string | null;
};

function keyFor(targetId: string): string {
  return `cosign-${targetId}`.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function toggleCosign(targetId: string): Promise<CosignResult> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) return { ok: false, error: "Sign in to cosign." };

  // Only a creator can cosign, and never themselves.
  const endorserId = (await creatorsOwnedBy(email))[0];
  if (!endorserId) return { ok: false, error: "Only creators can cosign." };
  if (endorserId === targetId)
    return { ok: false, error: "You can't cosign yourself." };

  const client = getWriteClient();

  const [target, doc] = await Promise.all([
    client.fetch<{ _id: string } | null>(
      `*[_type=="creator" && _id==$id][0]{_id}`,
      { id: targetId },
    ),
    client.fetch<{ favoriteCreators?: FavoriteItem[] | null } | null>(
      `*[_id==$id][0]{favoriteCreators}`,
      { id: endorserId },
    ),
  ]);
  if (!target) return { ok: false, error: "That creator can't be found." };

  const current: FavoriteItem[] = doc?.favoriteCreators ?? [];
  const already = current.some((f) => f.onSite?._ref === targetId);
  const next: FavoriteItem[] = already
    ? current.filter((f) => f.onSite?._ref !== targetId)
    : [
        ...current,
        {
          _type: "favoriteCreator",
          _key: keyFor(targetId),
          onSite: { _type: "reference", _ref: targetId },
        },
      ];

  try {
    await client.patch(endorserId).set({ favoriteCreators: next }).commit();
  } catch (cause) {
    console.error("[cosign] toggle failed", cause);
    return { ok: false, error: "Could not update — please try again." };
  }

  // The change shows on the endorser's own profile; the viewed profile is
  // unaffected. Both are the same route, so one revalidate covers it.
  revalidatePath("/creators/[slug]", "page");
  return { ok: true, cosigned: !already };
}

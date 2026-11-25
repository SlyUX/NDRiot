import type { Metadata } from "next";

import { OwnershipRow } from "@/components/ownership-row";
import { safeFetch, ADMIN_CREATORS_QUERY } from "@/lib/queries";
import { ownersOf } from "@/sanity/ownership-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ownership · ND Riot Admin",
  robots: { index: false },
};

/**
 * Admin ownership tool — reassign which verified email owns a creator profile
 * (and thus every comic under it). Gated by the /admin layout (isAdminEmail).
 */
export default async function OwnershipAdminPage() {
  const creators = await safeFetch<
    { _id: string; name: string; slug: string | null }[]
  >(ADMIN_CREATORS_QUERY, {}, []);
  const owners = await ownersOf(creators.map((c) => c._id));

  return (
    <>
      <h1 className="text-3xl font-black tracking-tighter uppercase">Ownership</h1>
      <p className="text-muted-foreground mt-3 max-w-prose text-sm">
        Reassign who owns a creator profile. This moves the profile and every
        comic under it to the new email — who must sign in with that Google
        account to edit. &ldquo;First to claim&rdquo; sets the owner; this is the
        admin override.
      </p>

      {creators.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">No creators yet.</p>
      ) : (
        <div className="mt-8">
          {creators.map((c) => (
            <OwnershipRow
              key={c._id}
              creatorId={c._id}
              name={c.name}
              slug={c.slug}
              currentOwner={owners[c._id] ?? null}
            />
          ))}
        </div>
      )}
    </>
  );
}

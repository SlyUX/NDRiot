import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { annotateHeroItems, pickHeroBooks } from "@/lib/hero-queue";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import { savedItems } from "@/sanity/reader-client";

export const dynamic = "force-dynamic";

/**
 * Background refill for the hero's "Spin the Rack" queue (SpinnerRack). Returns
 * more uniform-random picks from the full catalog (§3 equal odds), annotated
 * with this viewer's save/ownership state, skipping recently-shown ids. Never
 * cached — the picks are random and the save state is per-reader.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const exclude = (params.get("exclude") ?? "").split(",").filter(Boolean);
  const count = Math.min(Math.max(Number(params.get("count")) || 6, 1), 12);

  const session = await auth();
  const email = session?.user?.email;

  let savedBookIds = new Set<string>();
  let ownedCreatorIds: string[] = [];
  if (email) {
    const [saves, owned] = await Promise.all([
      savedItems(email),
      creatorsOwnedBy(email),
    ]);
    savedBookIds = new Set(
      saves.filter((s) => s.itemType === "book").map((s) => s.itemId),
    );
    ownedCreatorIds = owned;
  }

  const books = await pickHeroBooks(count, exclude);
  return NextResponse.json(
    { items: annotateHeroItems(books, savedBookIds, ownedCreatorIds) },
    { headers: { "cache-control": "no-store" } },
  );
}

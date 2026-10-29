"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { slugify } from "@/lib/intake/mapping";
import { safeFetch, SPINNER_BOOK_QUERY, SPINNER_RAG_QUERY } from "@/lib/queries";
import type { SpinnerBook, SpinnerRag } from "@/lib/types";
import {
  addRackItem,
  createStore as createStoreDoc,
  getStore,
  patchStoreMeta,
  recordPayout as recordPayoutDoc,
  removeRackItem as removeRackItemDoc,
  removeRackItems as removeRackItemsDoc,
  updateRackItem as updateRackItemDoc,
} from "@/sanity/spinner-store-client";

/** The public /racks/[slug] key for a store — deterministic from its identity. */
function storeSlug(state: string, storeName: string): string {
  return slugify(`${state} ${storeName}`);
}

/**
 * Admin-only server actions for the spinner-rack tool (/admin/spinner). The
 * pages are already gated, but every action re-checks — a server action is a
 * public endpoint. Writes go to the private ndriot_auth dataset via the client.
 */

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    throw new Error("Not authorized.");
  }
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
/** A number from a form field, or undefined when blank/invalid (so a patch skips it). */
function num(fd: FormData, key: string): number | undefined {
  const raw = str(fd, key);
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function createStore(fd: FormData): Promise<void> {
  await requireAdmin();
  const state = str(fd, "state");
  const storeName = str(fd, "storeName");
  if (!state || !storeName) throw new Error("State and store name are required.");
  const id = await createStoreDoc({
    state,
    storeName,
    slug: storeSlug(state, storeName),
    storeCutPercent: num(fd, "storeCutPercent"),
    ndRiotCutPercent: num(fd, "ndRiotCutPercent") ?? 0,
  });
  redirect(`/admin/spinner/${id}`);
}

export async function updateStoreMeta(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "storeId");
  if (!id) throw new Error("Missing store.");
  const fields: Record<string, unknown> = {
    status: str(fd, "status") || "active",
    contactName: str(fd, "contactName") || undefined,
    contactEmail: str(fd, "contactEmail") || undefined,
    address: str(fd, "address") || undefined,
    startDate: str(fd, "startDate") || undefined,
    endDate: str(fd, "endDate") || undefined,
  };
  const storeCut = num(fd, "storeCutPercent");
  const ndCut = num(fd, "ndRiotCutPercent");
  if (storeCut !== undefined) fields.storeCutPercent = storeCut;
  if (ndCut !== undefined) fields.ndRiotCutPercent = ndCut;
  // Backfill the public slug for a store created before slugs existed (state +
  // storeName aren't editable here, so a slug once set never needs to change).
  const existing = await getStore(id);
  if (existing && !existing.slug && existing.state && existing.storeName) {
    fields.slug = storeSlug(existing.state, existing.storeName);
  }
  await patchStoreMeta(id, fields);
  revalidatePath(`/admin/spinner/${id}`);
}

export async function addBookToRack(storeId: string, bookId: string): Promise<void> {
  await requireAdmin();
  if (!storeId || !bookId) throw new Error("Missing store or book.");
  // Authoritative read — never trust client-sent book data (the band depends on
  // the correct maturity + creator slug).
  const book = await safeFetch<SpinnerBook | null>(SPINNER_BOOK_QUERY, { id: bookId }, null);
  if (!book) throw new Error("Book not found.");
  await addRackItem(storeId, {
    kind: "book",
    bookId: book._id,
    bookTitle: book.title ?? undefined,
    bookSlug: book.slug ?? undefined,
    creatorId: book.creatorId ?? undefined,
    creatorName: book.creator?.name ?? undefined,
    creatorSlug: book.creator?.slug ?? undefined,
    price: undefined,
    lastCount: undefined,
    lastCountDate: undefined,
    sold: 0,
    shrink: 0,
  });
  revalidatePath(`/admin/spinner/${storeId}`);
}

// Pseudo-creator bucket for Rag sales: a Rag is a compilation with no single
// creator, so its proceeds roll up under ND Riot itself (one bucket across all
// issues, one payout line). Stable id so earnings + payouts stay keyed to it.
const RAG_CREATOR_ID = "nd-riot-rag";
const RAG_CREATOR_NAME = "ND Riot Rag";

export async function addRagToRack(storeId: string, ragId: string): Promise<void> {
  await requireAdmin();
  if (!storeId || !ragId) throw new Error("Missing store or Rag issue.");
  // Authoritative read — the band re-reads live too, but denormalize now so the
  // rack list and earnings have a title/slug without another fetch.
  const rag = await safeFetch<SpinnerRag | null>(SPINNER_RAG_QUERY, { id: ragId }, null);
  if (!rag) throw new Error("Rag issue not found.");
  const title = rag.issueNumber ? `Issue ${rag.issueNumber}: ${rag.title ?? ""}`.trim() : rag.title;
  await addRackItem(storeId, {
    kind: "rag",
    bookId: rag._id,
    bookTitle: title ?? undefined,
    bookSlug: rag.slug ?? undefined,
    creatorId: RAG_CREATOR_ID,
    creatorName: RAG_CREATOR_NAME,
    creatorSlug: undefined, // a Rag has no creator profile
    price: undefined,
    lastCount: undefined,
    lastCountDate: undefined,
    sold: 0,
    shrink: 0,
  });
  revalidatePath(`/admin/spinner/${storeId}`);
}

export async function updateRackItem(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "storeId");
  const key = str(fd, "key");
  if (!id || !key) throw new Error("Missing store or item.");
  const fields: Record<string, unknown> = {};
  const price = num(fd, "price");
  const lastCount = num(fd, "lastCount");
  const sold = num(fd, "sold");
  const shrink = num(fd, "shrink");
  if (price !== undefined) fields.price = price;
  if (lastCount !== undefined) fields.lastCount = lastCount;
  if (sold !== undefined) fields.sold = sold;
  if (shrink !== undefined) fields.shrink = shrink;
  const priceNote = str(fd, "priceNote");
  fields.priceNote = priceNote || undefined;
  const lastCountDate = str(fd, "lastCountDate");
  if (lastCountDate) fields.lastCountDate = lastCountDate;
  await updateRackItemDoc(id, key, fields);
  revalidatePath(`/admin/spinner/${id}`);
}

export async function removeRackItem(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "storeId");
  const key = str(fd, "key");
  if (!id || !key) throw new Error("Missing store or item.");
  await removeRackItemDoc(id, key);
  revalidatePath(`/admin/spinner/${id}`);
}

/** Bulk "Remove selected" — called directly from the client table (not a form). */
export async function removeRackItems(
  storeId: string,
  keys: string[],
): Promise<void> {
  await requireAdmin();
  if (!storeId || keys.length === 0) return;
  await removeRackItemsDoc(storeId, keys);
  revalidatePath(`/admin/spinner/${storeId}`);
}

export async function recordPayout(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "storeId");
  const creatorId = str(fd, "creatorId");
  const creatorName = str(fd, "creatorName");
  if (!id || !creatorId) throw new Error("Missing store or creator.");
  await recordPayoutDoc(id, creatorId, creatorName, {
    paidTotal: num(fd, "paidTotal"),
    lastPaidDate: str(fd, "lastPaidDate") || undefined,
    notes: str(fd, "notes") || undefined,
  });
  revalidatePath(`/admin/spinner/${id}`);
}

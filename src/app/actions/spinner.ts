"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { safeFetch, SPINNER_BOOK_QUERY } from "@/lib/queries";
import type { SpinnerBook } from "@/lib/types";
import {
  addRackItem,
  createStore as createStoreDoc,
  patchStoreMeta,
  recordPayout as recordPayoutDoc,
  removeRackItem as removeRackItemDoc,
  updateRackItem as updateRackItemDoc,
} from "@/sanity/spinner-store-client";

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

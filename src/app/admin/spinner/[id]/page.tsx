import Link from "next/link";
import { notFound } from "next/navigation";

import {
  recordPayout,
  removeRackItem,
  updateRackItem,
  updateStoreMeta,
} from "@/app/actions/spinner";
import { SpinnerBookPicker } from "@/components/spinner-book-picker";
import { safeFetch, SPINNER_BOOK_PICKER_QUERY } from "@/lib/queries";
import { computeEarnings, creatorShare, money, storeTitle } from "@/lib/spinner";
import type { SpinnerBookPick } from "@/lib/types";
import { getStore } from "@/sanity/spinner-store-client";

export const dynamic = "force-dynamic";

const field =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";
const label = "text-muted-foreground mb-0.5 block text-[10px] tracking-widest uppercase";
const btn =
  "bg-primary text-primary-foreground px-3 py-1.5 text-xs font-black tracking-widest uppercase";
const btnGhost =
  "text-muted-foreground hover:text-destructive text-[10px] font-black tracking-widest uppercase";

export default async function SpinnerStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [store, pickerBooks] = await Promise.all([
    getStore(id),
    safeFetch<SpinnerBookPick[]>(SPINNER_BOOK_PICKER_QUERY, {}, []),
  ]);
  if (!store) notFound();

  const earnings = computeEarnings(store);
  const sharePct = Math.round(creatorShare(store) * 100);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/spinner" className="text-muted-foreground hover:text-primary text-xs tracking-widest uppercase">
          ← All stores
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tighter uppercase">{storeTitle(store)}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Creator share after cuts: <span className="text-foreground font-bold">{sharePct}%</span>
        </p>
      </div>

      {/* Store meta + commission */}
      <section className="max-w-2xl">
        <h2 className="text-primary mb-3 text-sm font-black tracking-widest uppercase">Store details</h2>
        <form action={updateStoreMeta} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="storeId" value={store._id} />
          <div>
            <label className={label} htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={store.status ?? "active"} className={field}>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
          <div />
          <div>
            <label className={label} htmlFor="storeCutPercent">Store cut %</label>
            <input id="storeCutPercent" name="storeCutPercent" type="number" min={0} max={100} defaultValue={store.storeCutPercent ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="ndRiotCutPercent">ND Riot %</label>
            <input id="ndRiotCutPercent" name="ndRiotCutPercent" type="number" min={0} max={100} defaultValue={store.ndRiotCutPercent ?? 0} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="contactName">Contact</label>
            <input id="contactName" name="contactName" type="text" defaultValue={store.contactName ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="contactEmail">Contact email</label>
            <input id="contactEmail" name="contactEmail" type="text" defaultValue={store.contactEmail ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="startDate">Placed on</label>
            <input id="startDate" name="startDate" type="date" defaultValue={store.startDate ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="endDate">Removed on</label>
            <input id="endDate" name="endDate" type="date" defaultValue={store.endDate ?? ""} className={field} />
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="address">Address</label>
            <textarea id="address" name="address" rows={2} defaultValue={store.address ?? ""} className={field} />
          </div>
          <div className="col-span-2">
            <button type="submit" className={btn}>Save details</button>
          </div>
        </form>
      </section>

      {/* Add a book */}
      <section className="max-w-2xl">
        <h2 className="text-primary mb-3 text-sm font-black tracking-widest uppercase">Add a book to the rack</h2>
        <SpinnerBookPicker storeId={store._id} books={pickerBooks} />
      </section>

      {/* Rack + earnings, grouped by creator */}
      <section className="space-y-8">
        <h2 className="text-primary text-sm font-black tracking-widest uppercase">The rack</h2>
        {earnings.length === 0 && (
          <p className="text-muted-foreground text-sm">No books on the rack yet.</p>
        )}
        {earnings.map((c) => (
          <div key={c.creatorId} className="border-border space-y-4 border-t pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-lg font-black tracking-tight">{c.creatorName}</h3>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                {c.soldUnits} sold · gross {money(c.gross)} · expected{" "}
                <span className="text-foreground font-bold">{money(c.expected)}</span> · paid{" "}
                {money(c.paidTotal)} · owed{" "}
                <span className={c.outstanding > 0.005 ? "text-funding font-bold" : "text-foreground"}>
                  {money(c.outstanding)}
                </span>
              </p>
            </div>

            {/* Per-book inventory + print */}
            <div className="space-y-3">
              {c.items.map((item) => (
                <div key={item._key} className="border border-white/10 p-3">
                  <p className="mb-2 text-sm font-semibold">{item.bookTitle}</p>
                  <form action={updateRackItem} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                    <input type="hidden" name="storeId" value={store._id} />
                    <input type="hidden" name="key" value={item._key} />
                    <div>
                      <label className={label}>Price $</label>
                      <input name="price" type="number" step="0.01" min={0} defaultValue={item.price ?? ""} className={field} />
                    </div>
                    <div>
                      <label className={label}>Last count</label>
                      <input name="lastCount" type="number" min={0} defaultValue={item.lastCount ?? ""} className={field} />
                    </div>
                    <div>
                      <label className={label}>Count date</label>
                      <input name="lastCountDate" type="date" defaultValue={item.lastCountDate ?? ""} className={field} />
                    </div>
                    <div>
                      <label className={label}>Sold</label>
                      <input name="sold" type="number" min={0} defaultValue={item.sold ?? 0} className={field} />
                    </div>
                    <div>
                      <label className={label}>Shrink</label>
                      <input name="shrink" type="number" min={0} defaultValue={item.shrink ?? 0} className={field} />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className={btn}>Save</button>
                    </div>
                    <div className="col-span-2 sm:col-span-6">
                      <label className={label}>Price note (optional)</label>
                      <input name="priceNote" type="text" defaultValue={item.priceNote ?? ""} placeholder="e.g. raised to offset commission" className={field} />
                    </div>
                  </form>

                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    {/* Print the Seller Info Band for this book */}
                    <form method="get" action={`/admin/spinner/${store._id}/band`} className="flex items-end gap-2">
                      <input type="hidden" name="book" value={item.bookId} />
                      <div>
                        <label className={label}>Qty</label>
                        <input name="qty" type="number" min={1} max={200} defaultValue={5} className={`${field} w-20`} />
                      </div>
                      <button type="submit" className="border-primary text-primary border px-3 py-1.5 text-xs font-black tracking-widest uppercase">
                        Print bands
                      </button>
                    </form>
                    <form action={removeRackItem}>
                      <input type="hidden" name="storeId" value={store._id} />
                      <input type="hidden" name="key" value={item._key} />
                      <button type="submit" className={btnGhost}>Remove from rack</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>

            {/* Record a payment to this creator */}
            <form action={recordPayout} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="storeId" value={store._id} />
              <input type="hidden" name="creatorId" value={c.creatorId} />
              <input type="hidden" name="creatorName" value={c.creatorName} />
              <div>
                <label className={label}>Paid to date $</label>
                <input name="paidTotal" type="number" step="0.01" min={0} defaultValue={c.paidTotal || ""} className={`${field} w-28`} />
              </div>
              <div>
                <label className={label}>Last paid</label>
                <input name="lastPaidDate" type="date" className={field} />
              </div>
              <div className="min-w-[8rem] flex-1">
                <label className={label}>Notes</label>
                <input name="notes" type="text" className={field} />
              </div>
              <button type="submit" className={btn}>Record payment</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}

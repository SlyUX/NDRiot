import Link from "next/link";
import { notFound } from "next/navigation";

import {
  recordPayout,
  removeRackItem,
  updateRackItem,
  updateStoreMeta,
} from "@/app/actions/spinner";
import { SpinnerPrintSelection } from "@/components/spinner-print-selection";
import { SpinnerRackPicker } from "@/components/spinner-rack-picker";
import {
  safeFetch,
  SPINNER_BOOK_PICKER_QUERY,
  SPINNER_RAG_PICKER_QUERY,
} from "@/lib/queries";
import { computeEarnings, creatorShare, money, storeTitle } from "@/lib/spinner";
import { MATURITY_TIER_LABELS, type MaturityTier } from "@/lib/taxonomy";
import type {
  SpinnerBookPick,
  SpinnerRackItem,
  SpinnerRagPick,
} from "@/lib/types";
import { getStore } from "@/sanity/spinner-store-client";

export const dynamic = "force-dynamic";

const field =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";
const label = "text-muted-foreground mb-0.5 block text-[10px] tracking-widest uppercase";
const btn =
  "bg-primary text-primary-foreground px-3 py-1.5 text-xs font-black tracking-widest uppercase";
const btnGhost =
  "text-muted-foreground hover:text-destructive text-[10px] font-black tracking-widest uppercase";

// Shared grid template so the header row and every rack row line up as a table.
// Title | Author | Maturity | Price | Stock | Sold. Flat on mobile (stacks).
const rowGrid =
  "grid grid-cols-[1fr_auto] gap-x-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_4.5rem_4.5rem_3.5rem_3.5rem]";

/** The maturity label for a rack item: Rags are always Mature; a comic's rating
 *  is looked up from the picker read (already fetched), not stored on the item. */
function maturityLabel(
  item: SpinnerRackItem,
  byBookId: Map<string, MaturityTier | null>,
): string {
  const tier: MaturityTier | null =
    item.kind === "rag" ? "mature" : (byBookId.get(item.bookId ?? "") ?? null);
  return tier ? MATURITY_TIER_LABELS[tier] : "—";
}

export default async function SpinnerStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [store, pickerBooks, pickerRags] = await Promise.all([
    getStore(id),
    safeFetch<SpinnerBookPick[]>(SPINNER_BOOK_PICKER_QUERY, {}, []),
    safeFetch<SpinnerRagPick[]>(SPINNER_RAG_PICKER_QUERY, {}, []),
  ]);
  if (!store) notFound();

  // Hide anything already on this rack from the add pickers — a title can only
  // be on the rack once (adding again just duplicates the row).
  const onRackIds = new Set(
    (store.rack ?? []).map((i) => i.bookId).filter(Boolean),
  );

  const bookPicks = pickerBooks
    .filter((b) => !onRackIds.has(b._id))
    .map((b) => ({
      _id: b._id,
      title: b.title,
      subtitle: b.creator?.name ?? null,
    }));
  const ragPicks = pickerRags
    .filter((r) => !onRackIds.has(r._id))
    .map((r) => ({
      _id: r._id,
      title: r.title,
      subtitle: r.issueNumber ? `Issue ${r.issueNumber}` : null,
    }));

  // Comic maturity, keyed by book id — shown in the rack table (not stored on
  // the rack item). Rags resolve to Mature in maturityLabel().
  const maturityByBookId = new Map<string, MaturityTier | null>(
    pickerBooks.map((b) => [b._id, b.maturityRating]),
  );

  const earnings = computeEarnings(store);
  const sharePct = Math.round(creatorShare(store) * 100);

  // Flat rack, sorted by author then title — no per-creator headings (those
  // "fluffed" the page: most creators have only 1–3 books).
  const rack = (store.rack ?? []).slice().sort((a, b) => {
    const byAuthor = (a.creatorName ?? "").localeCompare(b.creatorName ?? "");
    return byAuthor !== 0
      ? byAuthor
      : (a.bookTitle ?? "").localeCompare(b.bookTitle ?? "");
  });
  const totalSold = rack.reduce((n, item) => n + (item.sold ?? 0), 0);

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

      {/* The rack — a compact table; each row expands to its management edits. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-primary text-sm font-black tracking-widest uppercase">The rack</h2>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {rack.length} {rack.length === 1 ? "title" : "titles"} · {totalSold} sold
          </p>
        </div>

        {rack.length === 0 ? (
          <p className="text-muted-foreground text-sm">No books on the rack yet.</p>
        ) : (
          <div className="border border-white/10">
            {/* Column header (sm+ only) */}
            <div
              className={`${rowGrid} text-muted-foreground border-b border-white/10 px-2 py-1.5 text-[10px] tracking-widest uppercase`}
            >
              <span>Title</span>
              <span className="hidden sm:block">Author</span>
              <span className="hidden text-right sm:block">Rating</span>
              <span className="hidden text-right sm:block">Price</span>
              <span className="hidden text-right sm:block">Stock</span>
              <span className="hidden text-right sm:block">Sold</span>
            </div>

            {rack.map((item) => (
              <details key={item._key} className="border-b border-white/10 last:border-b-0">
                <summary className={`${rowGrid} marker:text-muted-foreground cursor-pointer items-center px-2 py-2 text-sm hover:bg-white/5`}>
                  <span className="min-w-0 truncate font-semibold">
                    {item.bookTitle}
                    {item.kind === "rag" && (
                      <span className="text-muted-foreground ml-2 text-[10px] tracking-widest uppercase">Rag</span>
                    )}
                  </span>
                  <span className="text-muted-foreground hidden min-w-0 truncate text-xs sm:block">
                    {item.creatorName}
                  </span>
                  <span className="hidden text-right text-[10px] tracking-wider uppercase sm:block">
                    {maturityLabel(item, maturityByBookId)}
                  </span>
                  <span className="hidden text-right tabular-nums sm:block">
                    {item.price != null ? money(item.price) : "—"}
                  </span>
                  <span className="hidden text-right tabular-nums sm:block">
                    {item.lastCount ?? "—"}
                  </span>
                  <span className="text-muted-foreground text-right tabular-nums sm:text-foreground">
                    {item.sold ?? 0}
                  </span>
                </summary>

                <div className="space-y-3 bg-white/[0.02] px-3 pt-3 pb-4">
                  {/* Inventory + price edit */}
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

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    {/* Print the Seller Info Band for this one book */}
                    <form method="get" action={`/admin/spinner/${store._id}/band`} target="_blank" className="flex items-end gap-2">
                      <input type="hidden" name="book" value={item.bookId} />
                      <div>
                        <label className={label}>Qty</label>
                        <input name="qty" type="number" min={1} max={200} defaultValue={item.lastCount || 1} className={`${field} w-20`} />
                      </div>
                      <button type="submit" className="border-primary text-primary border px-3 py-1.5 text-xs font-black tracking-widest uppercase">
                        Print slips
                      </button>
                    </form>
                    <form action={removeRackItem}>
                      <input type="hidden" name="storeId" value={store._id} />
                      <input type="hidden" name="key" value={item._key} />
                      <button type="submit" className={btnGhost}>Remove from rack</button>
                    </form>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}

        {rack.length > 0 && (
          <SpinnerPrintSelection
            storeId={store._id}
            items={rack
              .filter((i) => i.bookId)
              .map((i) => ({
                bookId: i.bookId as string,
                title: i.bookTitle ?? "Untitled",
                author: i.creatorName ?? "",
                isRag: i.kind === "rag",
                lastCount: i.lastCount ?? 0,
              }))}
          />
        )}
      </section>

      {/* Add to the rack */}
      <section className="grid max-w-4xl gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-primary mb-3 text-sm font-black tracking-widest uppercase">Add a comic</h2>
          <SpinnerRackPicker storeId={store._id} kind="book" items={bookPicks} />
        </div>
        <div>
          <h2 className="text-primary mb-3 text-sm font-black tracking-widest uppercase">Add a Rag issue</h2>
          <SpinnerRackPicker storeId={store._id} kind="rag" items={ragPicks} />
        </div>
      </section>

      {/* Earnings & payouts — collapsed, one panel per creator */}
      <section className="space-y-2">
        <h2 className="text-primary text-sm font-black tracking-widest uppercase">Earnings &amp; payouts</h2>
        {earnings.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing to pay out yet.</p>
        ) : (
          <div className="border border-white/10">
            {earnings.map((c) => (
              <details key={c.creatorId} className="border-b border-white/10 last:border-b-0">
                <summary className="marker:text-muted-foreground flex cursor-pointer flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm hover:bg-white/5">
                  <span className="font-bold">{c.creatorName}</span>
                  <span className="text-muted-foreground text-xs tracking-wide uppercase">
                    owed{" "}
                    <span className={c.outstanding > 0.005 ? "text-funding font-bold" : "text-foreground"}>
                      {money(c.outstanding)}
                    </span>
                  </span>
                </summary>
                <div className="space-y-4 bg-white/[0.02] px-3 pt-2 pb-4">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    {c.soldUnits} sold · gross {money(c.gross)} · expected{" "}
                    <span className="text-foreground font-bold">{money(c.expected)}</span> · paid{" "}
                    {money(c.paidTotal)}
                  </p>
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
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

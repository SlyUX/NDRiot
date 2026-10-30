import Link from "next/link";
import { notFound } from "next/navigation";

import { recordPayout, updateStoreMeta } from "@/app/actions/spinner";
import {
  SpinnerRackTable,
  type RackTableRow,
} from "@/components/spinner-rack-table";
import { SpinnerStoreTabs } from "@/components/spinner-store-tabs";
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
import { logoUrlFromRef } from "@/sanity/spinner-public-client";

export const dynamic = "force-dynamic";

const field =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";
const label = "text-muted-foreground mb-0.5 block text-[10px] tracking-widest uppercase";
const btn =
  "bg-primary text-primary-foreground px-3 py-1.5 text-xs font-black tracking-widest uppercase";

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
  // Current logo (if any) for the thumbnail beside the upload field. getStore
  // reads the raw doc, so this is an asset ref, not a deref'd URL.
  const logoUrl = logoUrlFromRef(store.logo?.asset?._ref, 160);

  // Flat rack, sorted by author then title — the table carries author as a
  // column rather than a per-creator heading.
  const rows: RackTableRow[] = (store.rack ?? [])
    .filter((i) => i.bookId)
    .slice()
    .sort((a, b) => {
      const byAuthor = (a.creatorName ?? "").localeCompare(b.creatorName ?? "");
      return byAuthor !== 0
        ? byAuthor
        : (a.bookTitle ?? "").localeCompare(b.bookTitle ?? "");
    })
    .map((i) => ({
      key: i._key,
      bookId: i.bookId as string,
      kind: i.kind === "rag" ? "rag" : "book",
      title: i.bookTitle ?? "Untitled",
      author: i.creatorName ?? "",
      maturityLabel: maturityLabel(i, maturityByBookId),
      price: i.price ?? null,
      lastCount: i.lastCount ?? null,
      lastCountDate: i.lastCountDate ?? null,
      sold: i.sold ?? null,
      shrink: i.shrink ?? null,
      priceNote: i.priceNote ?? null,
    }));

  const totalSold = rows.reduce((n, r) => n + (r.sold ?? 0), 0);

  // Earnings & payouts panel — a collapsed disclosure per creator, handed to the
  // tabs as a server-rendered node (so recordPayout stays a server action).
  const earningsPanel = (
    <div className="space-y-2">
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
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/spinner" className="text-muted-foreground hover:text-primary text-xs tracking-widest uppercase">
          ← All stores
        </Link>
        <div className="mt-1 flex items-center gap-3">
          {logoUrl && (
            // Decorative — the store name sits right beside it (empty alt, §10).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 w-auto max-w-[120px] object-contain" />
          )}
          <h1 className="text-2xl font-black tracking-tighter uppercase">{storeTitle(store)}</h1>
        </div>
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
            <label className={label} htmlFor="logo">Store logo</label>
            <div className="flex items-center gap-3">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- cross-dataset asset (ndriot_auth), served direct from the CDN; next/image isn't configured for it
                <img src={logoUrl} alt="Current store logo" className="h-12 w-auto border border-white/20 bg-white/5 p-1" />
              )}
              <input id="logo" name="logo" type="file" accept="image/*" className="text-muted-foreground text-xs file:mr-3 file:border file:border-white/20 file:bg-transparent file:px-2 file:py-1 file:text-xs file:tracking-widest file:uppercase" />
            </div>
            <p className="text-muted-foreground mt-1 text-[10px]">Shown on the public shelf page. Choosing a file replaces the current logo on save.</p>
          </div>
          <div className="col-span-2">
            <button type="submit" className={btn}>Save details</button>
          </div>
        </form>
      </section>

      {/* The rack + earnings, as tabs */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-primary text-sm font-black tracking-widest uppercase">Inventory</h2>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {rows.length} {rows.length === 1 ? "title" : "titles"} · {totalSold} sold
          </p>
        </div>
        <SpinnerStoreTabs
          rack={
            <SpinnerRackTable
              storeId={store._id}
              rows={rows}
              bookPicks={bookPicks}
              ragPicks={ragPicks}
            />
          }
          earnings={earningsPanel}
        />
      </section>
    </div>
  );
}

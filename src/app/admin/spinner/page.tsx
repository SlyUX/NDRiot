import Link from "next/link";

import { createStore } from "@/app/actions/spinner";
import { storeTitle } from "@/lib/spinner";
import { US_STATES } from "@/lib/taxonomy";
import { listStores } from "@/sanity/spinner-store-client";

export const dynamic = "force-dynamic";

const fieldClass =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none";
const labelClass = "block text-xs tracking-widest uppercase mb-1";

export default async function SpinnerStoresPage() {
  const stores = await listStores();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black tracking-tighter uppercase">Spinner Racks</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage physical racks — inventory, commission, creator payouts, and the Seller Info Band.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-primary text-sm font-black tracking-widest uppercase">Stores</h2>
        {stores.length === 0 ? (
          <p className="text-muted-foreground text-sm">No stores yet — add one below.</p>
        ) : (
          <ul className="divide-border divide-y border-y border-white/10">
            {stores.map((s) => (
              <li key={s._id}>
                <Link
                  href={`/admin/spinner/${s._id}`}
                  className="hover:text-primary flex items-center justify-between gap-3 py-3 text-sm font-semibold"
                >
                  <span>{storeTitle(s)}</span>
                  <span className="text-muted-foreground text-xs tracking-widest uppercase">
                    {s.status === "ended" ? "Ended" : "Active"} · {s.rack?.length ?? 0} books →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="max-w-md space-y-4">
        <h2 className="text-primary text-sm font-black tracking-widest uppercase">New store</h2>
        <form action={createStore} className="space-y-4">
          <div>
            <label htmlFor="state" className={labelClass}>State</label>
            <select id="state" name="state" required className={fieldClass} defaultValue="">
              <option value="" disabled>Choose a state…</option>
              {US_STATES.map((st) => (
                <option key={st.code} value={st.code}>{st.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="storeName" className={labelClass}>Store name</label>
            <input id="storeName" name="storeName" type="text" required className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="storeCutPercent" className={labelClass}>Store cut %</label>
              <input id="storeCutPercent" name="storeCutPercent" type="number" min={0} max={100} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="ndRiotCutPercent" className={labelClass}>ND Riot %</label>
              <input id="ndRiotCutPercent" name="ndRiotCutPercent" type="number" min={0} max={100} defaultValue={0} className={fieldClass} />
            </div>
          </div>
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 text-sm font-black tracking-wide uppercase">
            Create store
          </button>
        </form>
      </section>
    </div>
  );
}

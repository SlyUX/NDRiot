import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { PrintButton } from "@/components/print-button";
import { safeFetch, SPINNER_BOOK_QUERY } from "@/lib/queries";
import { money } from "@/lib/spinner";
import { absoluteUrl } from "@/lib/site-url";
import { MATURITY_TIER_LABELS, type MaturityTier } from "@/lib/taxonomy";
import type { SpinnerBook } from "@/lib/types";
import { getStore } from "@/sanity/spinner-store-client";

export const dynamic = "force-dynamic";

/**
 * Seller Info Band — the customer-facing slip that goes in a bag-and-board behind
 * each comic. 2" tall × 8.5" wide, 5 per US Letter sheet, PURE BLACK ON WHITE:
 * ND Riot logo | maturity | creator-profile QR | price. Live book data is
 * re-read here (authoritative maturity + slug); price comes from the store's
 * rack item. Print from the browser (the toolbar is screen-only).
 */
export default async function SellerInfoBandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ book?: string; qty?: string }>;
}) {
  const { id } = await params;
  const { book: bookId, qty: qtyRaw } = await searchParams;
  if (!bookId) notFound();

  const [store, book] = await Promise.all([
    getStore(id),
    safeFetch<SpinnerBook | null>(SPINNER_BOOK_QUERY, { id: bookId }, null),
  ]);
  if (!store || !book) notFound();

  const item = store.rack?.find((r) => r.bookId === bookId);
  const qty = Math.min(200, Math.max(1, Number.parseInt(qtyRaw ?? "5", 10) || 5));

  const maturity =
    book.maturityRating && book.maturityRating in MATURITY_TIER_LABELS
      ? MATURITY_TIER_LABELS[book.maturityRating as MaturityTier]
      : "";
  const creatorSlug = book.creator?.slug ?? null;
  const profileUrl = creatorSlug ? absoluteUrl(`/creators/${creatorSlug}`) : null;
  const qrSvg = profileUrl
    ? await QRCode.toString(profileUrl, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      })
    : null;
  const priceLabel = item?.price != null ? money(item.price) : "$—";

  const css = `
    @page { size: letter; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      html, body { background: #fff !important; }
    }
    .sheet { width: 8.5in; margin: 0 auto; background: #fff; }
    .band {
      width: 8.5in; height: 2in; background: #fff; color: #000;
      box-sizing: border-box; border-bottom: 1px dashed #999;
      break-inside: avoid; display: flex; align-items: center;
      justify-content: space-between; gap: 0.3in; padding: 0 0.5in;
    }
    .band .logo { height: 1.05in; width: auto; filter: brightness(0); }
    .band .maturity { font-weight: 900; font-size: 26px; letter-spacing: 0.02em; text-transform: uppercase; }
    .band .qr { height: 1.55in; width: 1.55in; }
    .band .qr svg { width: 100%; height: 100%; display: block; }
    .band .price { font-weight: 900; font-size: 42px; }
  `;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="no-print mx-auto mb-6 flex max-w-[8.5in] flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <Link href={`/admin/spinner/${id}`} className="text-muted-foreground hover:text-primary text-xs tracking-widest uppercase">
            ← Back to store
          </Link>
          <p className="mt-1">
            <span className="font-bold">{qty}</span> bands · {book.title} · {priceLabel}
            {!maturity && <span className="text-destructive"> · ⚠ no maturity on this book</span>}
            {!qrSvg && <span className="text-destructive"> · ⚠ no creator slug for the QR</span>}
            {item?.price == null && <span className="text-destructive"> · ⚠ set a price on the rack first</span>}
          </p>
        </div>
        <PrintButton label="Print bands" />
      </div>

      <div className="sheet">
        {Array.from({ length: qty }).map((_, i) => (
          <div className="band" key={i}>
            {/* 1. Logo (forced black) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nd-riot-logo.svg" alt="ND Riot" className="logo" />
            {/* 2. Maturity */}
            <div className="maturity">{maturity}</div>
            {/* 3. Creator profile QR */}
            {qrSvg ? (
              <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            ) : (
              <div className="qr" />
            )}
            {/* 4. Price */}
            <div className="price">{priceLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

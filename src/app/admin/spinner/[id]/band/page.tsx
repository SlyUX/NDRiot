import { Fragment } from "react";
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

async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Printed slip for a book on a spinner rack — TWO pages per copy, one band per
 * sheet (so it slips behind the comic without covering the cover):
 *  1. The Seller Info Band (2" tall, full width, at the top): ND Riot logo |
 *     maturity | creator-profile QR | price.
 *  2. A book-info page: title, author, description, and a QR to the book on
 *     ndriot.com.
 * Pure black on white. Live book data is re-read here (authoritative). `qty`
 * repeats the whole two-page set.
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
  const qty = Math.min(200, Math.max(1, Number.parseInt(qtyRaw ?? "1", 10) || 1));

  const maturity =
    book.maturityRating && book.maturityRating in MATURITY_TIER_LABELS
      ? MATURITY_TIER_LABELS[book.maturityRating as MaturityTier]
      : "";
  const priceLabel = item?.price != null ? money(item.price) : "$—";
  const author = book.creator?.name ?? "";
  const description = book.descriptionText ?? "";

  // Band QR → the creator's profile; info-page QR → the book's page.
  const creatorSlug = book.creator?.slug ?? null;
  const bookSlug = book.slug ?? null;
  const creatorQr = creatorSlug ? await qrSvg(absoluteUrl(`/creators/${creatorSlug}`)) : null;
  const bookQr = bookSlug ? await qrSvg(absoluteUrl(`/comics/${bookSlug}`)) : null;

  const css = `
    @page { size: letter; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      html, body { background: #fff !important; }
    }
    .sheets { background: #777; }
    @media print { .sheets { background: #fff; } }
    .page {
      width: 8.5in; height: 11in; background: #fff; color: #000;
      box-sizing: border-box; page-break-after: always; break-after: page;
      margin: 0 auto 0.25in; overflow: hidden;
    }
    @media print { .page { margin: 0; } }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .band {
      width: 8.5in; height: 2in; box-sizing: border-box; display: flex;
      align-items: center; justify-content: space-between; gap: 0.3in;
      padding: 0 0.5in; border-bottom: 1px solid #000;
    }
    .band .logo { height: 1.05in; width: auto; filter: brightness(0); }
    .band .maturity { font-weight: 900; font-size: 26px; letter-spacing: 0.02em; text-transform: uppercase; }
    .band .qr { height: 1.55in; width: 1.55in; }
    .band .price { font-weight: 900; font-size: 42px; }
    .info { padding: 1in 1.25in; max-width: 7in; }
    .info h1 { font-size: 40px; font-weight: 900; line-height: 1.05; margin: 0 0 6px; }
    .info .author { font-size: 20px; margin: 0 0 20px; }
    .info .desc { font-size: 15px; line-height: 1.6; margin: 0 0 28px; white-space: pre-wrap; }
    .info .infoqr { height: 2in; width: 2in; }
    .info .qrlabel { font-size: 12px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.12em; }
    .qr svg, .infoqr svg { width: 100%; height: 100%; display: block; }
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
            <span className="font-bold">{qty}</span> × (band + info) · {book.title} · {priceLabel}
            {!maturity && <span className="text-destructive"> · ⚠ no maturity</span>}
            {!creatorQr && <span className="text-destructive"> · ⚠ no creator QR</span>}
            {!bookQr && <span className="text-destructive"> · ⚠ no book QR</span>}
            {item?.price == null && <span className="text-destructive"> · ⚠ set a price first</span>}
          </p>
        </div>
        <PrintButton label="Print slips" />
      </div>

      <div className="sheets">
        {Array.from({ length: qty }).map((_, i) => (
          <Fragment key={i}>
            {/* Page 1 — the band, one per sheet, at the top */}
            <div className="page">
              <div className="band">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nd-riot-logo.svg" alt="ND Riot" className="logo" />
                <div className="maturity">{maturity}</div>
                {creatorQr ? (
                  <div className="qr" dangerouslySetInnerHTML={{ __html: creatorQr }} />
                ) : (
                  <div className="qr" />
                )}
                <div className="price">{priceLabel}</div>
              </div>
            </div>

            {/* Page 2 — book info column */}
            <div className="page">
              <div className="info">
                <h1>{book.title}</h1>
                {author && <p className="author">by {author}</p>}
                {description && <p className="desc">{description}</p>}
                {bookQr && (
                  <>
                    <div className="infoqr" dangerouslySetInnerHTML={{ __html: bookQr }} />
                    <p className="qrlabel">Find it on ndriot.com</p>
                  </>
                )}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

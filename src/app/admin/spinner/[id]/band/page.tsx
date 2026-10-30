import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { PrintButton } from "@/components/print-button";
import { safeFetch, SPINNER_BOOK_QUERY, SPINNER_RAG_QUERY } from "@/lib/queries";
import { money } from "@/lib/spinner";
import { absoluteUrl } from "@/lib/site-url";
import { MATURITY_TIER_LABELS, type MaturityTier } from "@/lib/taxonomy";
import type { SpinnerBook, SpinnerRag, SpinnerStoreDoc } from "@/lib/types";
import { getStore } from "@/sanity/spinner-store-client";

export const dynamic = "force-dynamic";

// A hard ceiling on total slips in one batch — keeps a stray "print all" on a
// huge rack from generating thousands of pages.
const MAX_SLIPS = 200;

async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** One item's print payload — all live data resolved, repeated `qty` times. */
interface PrintItem {
  itemId: string;
  kind: "book" | "rag";
  qty: number;
  title: string;
  author: string;
  description: string;
  priceLabel: string;
  centerLabel: string; // maturity badge ("" when a comic is missing a rating)
  missingPrice: boolean;
  missingMaturity: boolean;
  bandQr: string | null;
  infoQr: string | null;
}

/**
 * Resolve one rack item into its print payload: a live, authoritative read of
 * the comic/Rag (title, maturity, slug) plus the band + info QR codes. Returns
 * null when the item isn't on the rack or its content can't be found.
 */
async function resolvePrintItem(
  store: SpinnerStoreDoc,
  itemId: string,
  qty: number,
): Promise<PrintItem | null> {
  const item = store.rack?.find((r) => r.bookId === itemId);
  if (!item) return null;
  const kind = item.kind === "rag" ? "rag" : "book";

  const book =
    kind === "book"
      ? await safeFetch<SpinnerBook | null>(SPINNER_BOOK_QUERY, { id: itemId }, null)
      : null;
  const rag =
    kind === "rag"
      ? await safeFetch<SpinnerRag | null>(SPINNER_RAG_QUERY, { id: itemId }, null)
      : null;
  const content = book ?? rag;
  if (!content) return null;

  const title =
    kind === "rag" && rag?.issueNumber
      ? `Issue ${rag.issueNumber}: ${rag.title ?? ""}`.trim()
      : (content.title ?? "");
  const author = kind === "rag" ? "An ND Riot Rag" : (book?.creator?.name ?? "");
  const description = content.descriptionText ?? "";
  const priceLabel = item.price != null ? money(item.price) : "$—";

  // Center band slot: the comic's maturity badge; a Rag always reads "Mature".
  const tier: MaturityTier | null =
    kind === "rag"
      ? "mature"
      : book?.maturityRating && book.maturityRating in MATURITY_TIER_LABELS
        ? (book.maturityRating as MaturityTier)
        : null;
  const centerLabel = tier ? MATURITY_TIER_LABELS[tier] : "";

  // QR targets. Comic: band → creator profile, info → book page. Rag: both →
  // the issue page (there's no creator profile to link).
  const bandUrl =
    kind === "rag"
      ? rag?.slug
        ? absoluteUrl(`/magazine/${rag.slug}`)
        : null
      : book?.creator?.slug
        ? absoluteUrl(`/creators/${book.creator.slug}`)
        : null;
  const infoUrl = content.slug
    ? absoluteUrl(`${kind === "rag" ? "/magazine/" : "/comics/"}${content.slug}`)
    : null;

  return {
    itemId,
    kind,
    qty,
    title,
    author,
    description,
    priceLabel,
    centerLabel,
    missingPrice: item.price == null,
    missingMaturity: kind === "book" && !centerLabel,
    bandQr: bandUrl ? await qrSvg(bandUrl) : null,
    infoQr: infoUrl ? await qrSvg(infoUrl) : null,
  };
}

/**
 * Printed slips for one or more rack items — TWO pages per copy, one band per
 * sheet (so it slips behind the comic without covering the cover):
 *  1. The Seller Info Band (1.5" tall, full width, at the top): ND Riot logo |
 *     maturity badge | QR | price. (Rag → "Mature" + QR to the issue.)
 *  2. A book-info page: title, author, description, QR to the item on ndriot.com.
 *
 * Three selection modes (admin store page drives all three):
 *  - ?book=<id>&qty=<n>     one item, explicit quantity (per-row "Print slips")
 *  - ?items=<id>:<n>,<id>:<n>   a chosen subset with per-item quantities
 *  - ?all=1                 every item on the rack, qty = its current stock
 * Live item data is re-read here (authoritative). Total copies cap at MAX_SLIPS.
 */
export default async function SellerInfoBandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    book?: string;
    qty?: string;
    items?: string;
    all?: string;
  }>;
}) {
  const { id } = await params;
  const { book, qty: qtyRaw, items: itemsRaw, all } = await searchParams;

  const store = await getStore(id);
  if (!store) notFound();
  const rack = store.rack ?? [];

  const clampQty = (n: number) => Math.min(MAX_SLIPS, Math.max(1, n));

  // Resolve the requested (itemId, qty) list from whichever mode was used.
  let requests: { itemId: string; qty: number }[];
  if (all === "1") {
    // Every item, one slip per copy currently on the rack; skip empties.
    requests = rack
      .filter((r) => r.bookId && (r.lastCount ?? 0) > 0)
      .map((r) => ({ itemId: r.bookId as string, qty: clampQty(r.lastCount ?? 1) }));
  } else if (itemsRaw) {
    requests = itemsRaw
      .split(",")
      .map((pair) => {
        const [itemId, qtyStr] = pair.split(":");
        if (!itemId) return null;
        const fromRackCount =
          rack.find((r) => r.bookId === itemId)?.lastCount ?? 1;
        const parsed = Number.parseInt(qtyStr ?? "", 10);
        return {
          itemId,
          qty: clampQty(Number.isFinite(parsed) ? parsed : fromRackCount),
        };
      })
      .filter((x): x is { itemId: string; qty: number } => x !== null);
  } else if (book) {
    requests = [
      { itemId: book, qty: clampQty(Number.parseInt(qtyRaw ?? "1", 10) || 1) },
    ];
  } else {
    requests = [];
  }
  if (requests.length === 0) notFound();

  const resolved = (
    await Promise.all(
      requests.map((r) => resolvePrintItem(store, r.itemId, r.qty)),
    )
  ).filter((x): x is PrintItem => x !== null);
  if (resolved.length === 0) notFound();

  // Flatten to one entry per physical slip, capped at MAX_SLIPS total.
  const copies: PrintItem[] = [];
  for (const item of resolved) {
    for (let i = 0; i < item.qty && copies.length < MAX_SLIPS; i++) {
      copies.push(item);
    }
  }
  const warnings = resolved.filter(
    (r) => r.missingMaturity || r.missingPrice || !r.bandQr || !r.infoQr,
  );

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
      width: 8.5in; height: 1.5in; box-sizing: border-box; display: flex;
      align-items: center; justify-content: space-between; gap: 0.3in;
      padding: 0 0.5in; border-bottom: 1px solid #000;
    }
    /* No brightness(0): a CSS filter forces the SVG to rasterize at screen DPI
       (pixelated in print). Left as the native vector — pink on a color
       printer, gray on B&W — so it stays crisp at any resolution. */
    .band .logo { height: 0.8in; width: auto; }
    .band .maturity { font-weight: 900; font-size: 24px; letter-spacing: 0.02em; text-transform: uppercase; }
    .band .qr { height: 0.6in; width: 0.6in; }
    .band .price { font-weight: 900; font-size: 40px; }
    .info { padding: 1in 0.75in; }
    .info h1 { font-size: 40px; font-weight: 900; line-height: 1.05; margin: 0 0 6px; }
    .info .author { font-size: 20px; margin: 0 0 20px; }
    /* Real paragraphs, not pre-wrap: pt::text joins blocks with "\n\n" and any
       empty editor block adds another, which rendered as multiple blank lines.
       Splitting into <p>s with a fixed margin makes every gap a single,
       uniform paragraph break regardless of how many blank blocks are present. */
    .info .desc { margin: 0 0 28px; }
    .info .desc p { font-size: 15px; line-height: 1.6; margin: 0 0 12px; }
    .info .desc p:last-child { margin-bottom: 0; }
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
            <span className="font-bold">{resolved.length}</span>{" "}
            {resolved.length === 1 ? "title" : "titles"} ·{" "}
            <span className="font-bold">{copies.length}</span>{" "}
            {copies.length === 1 ? "slip" : "slips"}
            {copies.length >= MAX_SLIPS && (
              <span className="text-destructive"> · capped at {MAX_SLIPS}</span>
            )}
          </p>
          {warnings.length > 0 && (
            <ul className="text-destructive mt-1 text-xs">
              {warnings.map((w) => (
                <li key={w.itemId}>
                  ⚠ {w.title}:{" "}
                  {[
                    w.missingPrice ? "set a price" : null,
                    w.missingMaturity ? "no maturity" : null,
                    !w.bandQr ? "no band QR" : null,
                    !w.infoQr ? "no info QR" : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>
        <PrintButton label="Print slips" />
      </div>

      <div className="sheets">
        {copies.map((item, i) => (
          <Fragment key={i}>
            {/* Page 1 — the band, one per sheet, at the top */}
            <div className="page">
              <div className="band">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nd-riot-logo.svg" alt="ND Riot" className="logo" />
                <div className="maturity">{item.centerLabel}</div>
                {item.bandQr ? (
                  <div className="qr" dangerouslySetInnerHTML={{ __html: item.bandQr }} />
                ) : (
                  <div className="qr" />
                )}
                <div className="price">{item.priceLabel}</div>
              </div>
            </div>

            {/* Page 2 — item info column */}
            <div className="page">
              <div className="info">
                <h1>{item.title}</h1>
                {item.author && (
                  <p className="author">{item.kind === "rag" ? item.author : `by ${item.author}`}</p>
                )}
                {(() => {
                  const paras = item.description
                    .split(/\n\s*\n/)
                    .map((p) => p.trim())
                    .filter(Boolean);
                  return paras.length > 0 ? (
                    <div className="desc">
                      {paras.map((para, pi) => (
                        <p key={pi}>{para}</p>
                      ))}
                    </div>
                  ) : null;
                })()}
                {item.infoQr && (
                  <>
                    <div className="infoqr" dangerouslySetInnerHTML={{ __html: item.infoQr }} />
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

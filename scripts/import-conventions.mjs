#!/usr/bin/env node
/**
 * Imports the Indie Comics Circuit convention list into Sanity.
 *
 *   node scripts/import-conventions.mjs ~/Downloads/circuit.html            # dry run
 *   node scripts/import-conventions.mjs ~/Downloads/circuit.html --commit   # writes
 *   node scripts/import-conventions.mjs ~/Downloads/circuit.html --commit --drafts
 *
 * The source is the compiled HTML page's `SHOWS` array. Rules:
 *
 *  1. Published by default (curated directory content Stephen asked for), each
 *     with `datesVerified: false` — honest to the source's "verify before you
 *     travel", and it makes the site show a "dates need verifying" badge until
 *     an admin confirms. `--drafts` writes review drafts instead.
 *  2. createIfNotExists on a deterministic id (`convention-<slug>`), so a re-run
 *     never clobbers edits and reports skips.
 *  3. Logos are SKIPPED — they're hotlinks to other servers, and a convention's
 *     mark needs permission before it goes on ND Riot (per the source's own note).
 *  4. The "Gone dark" (DEAD) list is skipped — those don't run any more.
 *  5. Fields with no home in the schema (kind, size, organizer, tabling, broad
 *     region) are counted and reported, not silently dropped.
 */

import { readFile } from "node:fs/promises";

import { loadToken, mutate } from "./lib/sanity.mjs";

/** Slug from a name — matches scripts/lib/shared.mjs (inlined to avoid that
 *  module's taxonomy-load side effect). */
function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

const US_STATE_CODES = new Set(
  ("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO " +
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC")
    .split(" "),
);
const KIND = { core: "comics-first", zine: "zine", adjacent: "broader" };
/** Source uses "—" for unknown; treat as empty. */
const clean = (v) => (v && v.trim() && v.trim() !== "—" ? v.trim() : null);
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Extract the `SHOWS = [ … ]` array from the HTML and evaluate it (plain data
 *  literals only — no calls). The file is a trusted local export. */
async function loadShows(path) {
  const html = await readFile(path, "utf8");
  const m = html.match(/const\s+SHOWS\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("Couldn't find the SHOWS array in that file.");
  return Function(`"use strict"; return (${m[1]});`)();
}

/** "N. Bethesda, MD" → { city:"N. Bethesda", region:"MD" }. */
function parsePlace(cityField) {
  const i = cityField.lastIndexOf(",");
  if (i === -1) return { city: cityField.trim(), region: null };
  const city = cityField.slice(0, i).trim();
  const code = cityField.slice(i + 1).trim().toUpperCase();
  return { city, region: US_STATE_CODES.has(code) ? code : null };
}

const iso = (y, mth, d) =>
  `${y}-${String(mth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** End date from a "D1–D2 Mon YYYY" range; null for single-day or unparseable. */
function parseEndDate(d) {
  const m = d.match(/^(\d+)[–-](\d+)\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const [, , d2, mon, year] = m;
  const mth = MONTHS[mon.slice(0, 3).toLowerCase()];
  return mth ? iso(Number(year), mth, Number(d2)) : null;
}

/** Recurring/status hint for shows without a confirmed next date. */
function whenHint(show) {
  if (show.s === "annual") return show.d.split("·")[0].trim(); // "Annual, spring"
  if (show.s === "unconfirmed") return show.d.trim();
  return null;
}

function toDoc(show) {
  const slug = slugify(show.n);
  const place = parsePlace(show.city);
  const doc = {
    _type: "convention",
    name: show.n,
    slug: { _type: "slug", current: slug },
    place: {
      _type: "place",
      ...(place.city ? { city: place.city } : {}),
      ...(place.region ? { region: place.region } : {}),
      country: "United States",
    },
    ...(KIND[show.t] ? { kind: KIND[show.t] } : {}),
    ...(show.b ? { description: show.b } : {}),
    ...(show.url ? { website: show.url } : {}),
    ...(clean(show.size) ? { size: clean(show.size) } : {}),
    ...(clean(show.who) ? { organizer: clean(show.who) } : {}),
    ...(clean(show.tab) ? { tabling: clean(show.tab) } : {}),
    datesVerified: false,
    communitySubmitted: false,
    imageApproved: true,
  };
  if (show.s === "confirmed" && show.sort) {
    doc.startDate = show.sort;
    const end = parseEndDate(show.d);
    if (end && end > show.sort) doc.endDate = end;
  } else {
    const hint = whenHint(show);
    if (hint) doc.whenHint = hint;
  }
  return { slug, doc, place };
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/import-conventions.mjs <file.html> [--commit] [--drafts]");
    process.exit(1);
  }
  const commit = process.argv.includes("--commit");
  const drafts = process.argv.includes("--drafts");

  const shows = await loadShows(path);
  const mutations = [];
  const noRegion = [];
  console.log(`Parsed ${shows.length} shows.\n`);

  for (const show of shows) {
    const { slug, doc, place } = toDoc(show);
    const id = `${drafts ? "drafts." : ""}convention-${slug}`;
    if (!place.region) noRegion.push(`${show.n} (${show.city})`);
    const dateLine = doc.startDate
      ? `${doc.startDate}${doc.endDate ? `–${doc.endDate}` : ""}`
      : doc.whenHint
        ? `hint: "${doc.whenHint}"`
        : "no date";
    console.log(
      `  ${show.n}\n    → ${place.city}, ${place.region ?? "??"} · ${dateLine} · ${show.s}`,
    );
    mutations.push({ createIfNotExists: { _id: id, ...doc } });
  }

  console.log(
    `\nTarget: ${drafts ? "DRAFTS" : "PUBLISHED"} · datesVerified:false · logos skipped · DEAD list skipped.`,
  );
  console.log(
    `Stored: name, place, kind, dates/hint, website, description, size, organizer, tabling.`,
  );
  console.log(`Not stored: broad region (place uses the US state instead); logos.`);
  if (noRegion.length)
    console.log(`\nNo US-state parsed (region left blank): ${noRegion.join("; ")}`);

  if (!commit) {
    console.log(`\n(dry run — ${mutations.length} conventions. Pass --commit to write.)`);
    return;
  }
  const token = await loadToken();
  const result = await mutate(mutations, { token, commit: true });
  console.log(`\nCommitted. Results: ${result?.results?.length ?? mutations.length} mutations.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

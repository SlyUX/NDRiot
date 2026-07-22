#!/usr/bin/env node
/**
 * Imports book submissions from a CSV — either the books form's export, or a
 * spreadsheet filled in by hand.
 *
 *   node scripts/import-books.mjs data/books.csv           # dry run
 *   node scripts/import-books.mjs data/books.csv --commit  # writes drafts
 *
 * Same rules as the creator importer: drafts only, never overwrites, fails
 * loudly rather than importing junk.
 *
 * The hand-filled sheet is not a fallback, it is the point. A creator with a
 * back catalogue is not going to fill a form fifteen times — Joseph Christy
 * submitted fifteen titles in a single answer — and a spreadsheet with the
 * same column names imports identically. The form is for books published from
 * now on; the sheet is for everything already out there.
 *
 * A book cannot exist without its creator, so a row whose creator is not
 * already in the CMS is reported and skipped rather than guessed at.
 */

import { readFile } from 'node:fs/promises'

import { parseCsv, toRecords } from './lib/csv.mjs'
import { loadToken, mutate, query, uploadImage } from './lib/sanity.mjs'
import {
  GENRES,
  FORMATS,
  MATURITY,
  STATUSES,
  matchTaxonomy,
  repairText,
  slugify,
  toPortableText,
} from './lib/shared.mjs'

/** Column → field. Anything else present is reported rather than dropped. */
const MAPPED_COLUMNS = new Set([
  'Timestamp',
  'Email Address',
  'Title',
  'Creator',
  'Preferred web address',
  'Format',
  'Genres',
  'Who is it for?',
  'Publication status',
  'Short description',
  'Full description',
  'Cover image',
  'Describe the cover',
  'Where to buy',
  'Kickstarter link',
  'Can we publish this?',
])

/**
 * Parses the buy-links answer.
 *
 * One per line as "Store — URL". Google Forms cannot repeat a group of
 * fields, so a single paragraph with a stated format beats five fixed pairs
 * that are mostly left blank. A line with no store name still imports, using
 * the hostname, because a working link with a dull label is better than a
 * dropped link.
 */
function parseBuyLinks(answer) {
  return (answer ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [rawStore, ...rest] = line.split(/\s+[—–-]\s+/)
      const url = (rest.join(' — ') || rawStore).trim()
      if (!/^https?:\/\//.test(url)) return null

      let store = rest.length ? rawStore.trim() : ''
      if (!store) {
        try {
          store = new URL(url).hostname.replace(/^www\./, '')
        } catch {
          store = 'Buy'
        }
      }
      return { _type: 'buyLink', _key: `buy${i}`, store, url }
    })
    .filter(Boolean)
}

async function main() {
  const [, , csvPath, ...flags] = process.argv
  const commit = flags.includes('--commit')

  if (!csvPath) {
    console.error('Usage: node scripts/import-books.mjs <csv> [--commit]')
    process.exit(1)
  }

  const token = await loadToken()
  const records = toRecords(parseCsv(await readFile(csvPath, 'utf8')))

  console.log(`\n${commit ? 'IMPORTING' : 'DRY RUN — nothing will be written'}`)
  console.log(`${records.length} row(s) in ${csvPath}\n`)

  const creators = await query('*[_type=="creator"]{_id,name,"slug":slug.current}')
  const existingBooks = await query('*[_type=="book"]{"slug":slug.current}')
  const takenSlugs = new Set(existingBooks.map((b) => b.slug))

  const mutations = []
  const unmapped = new Set()
  const warnings = []

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!MAPPED_COLUMNS.has(key) && record[key]) unmapped.add(key)
    }

    const title = repairText(record.Title)
    if (!title) continue

    const slug = slugify(record['Preferred web address'] || title)
    console.log(`── ${title}  →  /books/${slug}`)

    if (takenSlugs.has(slug)) {
      console.log('   already exists — skipping\n')
      continue
    }

    // A book with no creator has nowhere to live: the schema requires the
    // reference, and guessing which person was meant is worse than stopping.
    const creatorName = repairText(record.Creator).trim()
    const creator = creators.find((c) => c.name.toLowerCase() === creatorName.toLowerCase())
    if (!creator) {
      warnings.push(
        `${title}: creator "${creatorName}" is not in the CMS. Add them first, then re-run.`,
      )
      console.log(`   creator "${creatorName}" not found — skipping\n`)
      continue
    }
    console.log(`   creator: ${creator.name}`)

    const genreMatch = matchTaxonomy(record.Genres, GENRES)
    const formatMatch = matchTaxonomy(record.Format, FORMATS, { single: true })
    const audienceMatch = matchTaxonomy(record['Who is it for?'], MATURITY, { single: true })
    const statusMatch = matchTaxonomy(record['Publication status'], STATUSES, { single: true })

    for (const [label, result] of [
      ['genres', genreMatch],
      ['format', formatMatch],
      ['audience', audienceMatch],
      ['status', statusMatch],
    ]) {
      if (result.matched.length) console.log(`   ${label}: ${result.matched.join(', ')}`)
      if (result.unknown.length) {
        warnings.push(`${title}: unrecognised ${label} — ${result.unknown.join(', ')}`)
        console.log(`   ${label}: UNRECOGNISED — ${result.unknown.join(', ')}`)
      }
    }

    const cover = await uploadImage(record['Cover image'], {
      token,
      commit,
      label: `${slug}-cover`,
    })
    if (cover.error) {
      warnings.push(`${title}: cover not imported — ${cover.error}`)
      console.log(`   cover: SKIPPED — ${cover.error}`)
    } else if (cover.assetId || cover.dryRun) {
      console.log(`   cover: ok (${((cover.bytes ?? 0) / 1024).toFixed(0)}KB)`)
    }

    const buyLinks = parseBuyLinks(record['Where to buy'])
    if (buyLinks.length) console.log(`   buy links: ${buyLinks.map((b) => b.store).join(', ')}`)

    const doc = {
      _id: `drafts.book-${slug}`,
      _type: 'book',
      title,
      slug: { _type: 'slug', current: slug },
      creator: { _type: 'reference', _ref: creator._id },
    }

    if (genreMatch.matched.length) doc.genres = genreMatch.matched.slice(0, 3)
    if (formatMatch.matched.length) doc.format = formatMatch.matched[0]
    if (audienceMatch.matched.length) doc.maturity = audienceMatch.matched[0]
    if (statusMatch.matched.length) doc.status = statusMatch.matched[0]

    const short = repairText(record['Short description'])
    if (short) doc.shortDescription = short
    const full = repairText(record['Full description'])
    if (full) doc.description = toPortableText(full)

    const kickstarter = record['Kickstarter link']?.trim()
    if (/^https?:\/\//.test(kickstarter ?? '')) doc.kickstarterUrl = kickstarter
    if (buyLinks.length) doc.buyLinks = buyLinks

    if (cover.assetId) {
      doc.cover = {
        _type: 'imageWithAlt',
        asset: { _type: 'reference', _ref: cover.assetId },
        alt: repairText(record['Describe the cover']) || undefined,
      }
    }

    mutations.push({ createIfNotExists: doc })
    takenSlugs.add(slug)
    console.log('')
  }

  if (mutations.length === 0) {
    console.log('No new books to create.')
  } else {
    const result = await mutate(mutations, { token, commit })
    console.log(`${commit ? 'Created' : 'Would create'} ${result.results.length} draft book(s):`)
    for (const r of result.results) console.log(`   ${r.id}`)
  }

  if (warnings.length) {
    console.log('\nNeeds a human:')
    for (const w of warnings) console.log(`   • ${w}`)
  }

  if (unmapped.size) {
    console.log('\nColumns with nowhere to go in the schema:')
    for (const c of unmapped) console.log(`   • ${c}`)
  }

  console.log(
    commit
      ? '\nAll created as DRAFTS. Review and publish in /studio.\n'
      : '\nDry run. Re-run with --commit to write.\n',
  )
}

main().catch((error) => {
  console.error(`\n${error.message}\n`)
  process.exit(1)
})

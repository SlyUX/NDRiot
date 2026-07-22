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
  LINK_KINDS,
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
  'Where to find it',
  'Where to buy',
  'Kickstarter link',
  'Issues available',
  'Can we publish this?',
  // Known and deliberately unused. Sanity documents are publicly readable,
  // so a contact address in the CMS is a contact address published to
  // anyone who runs a GROQ query. Listed here so they do not each raise a
  // "nowhere to go" warning that trains the reader to skim past real ones.
  'Which email should we use to contact you?',
  'Alternate email address',
])

/**
 * Hosts whose purpose is unambiguous, so the kind can be filled in rather
 * than asked for twice.
 *
 * This is import convenience, not the inference AGENTS.md §3 forbids — that
 * rule is about the site guessing what a READER wants. Here a human reviews
 * every draft before it publishes, and a wrong guess is visible and
 * correctable in the Studio.
 */
const KIND_BY_HOST = [
  [/(^|\.)patreon\.com$/, 'Support'],
  [/(^|\.)ko-fi\.com$/, 'Support'],
  [/(^|\.)buymeacoffee\.com$/, 'Support'],
  [/(^|\.)kickstarter\.com$/, 'Back'],
  [/(^|\.)indiegogo\.com$/, 'Back'],
  [/(^|\.)backerkit\.com$/, 'Back'],
  [/(^|\.)webtoons?\.com$/, 'Read free'],
  [/(^|\.)tapas\.io$/, 'Read free'],
  [/(^|\.)globalcomix\.com$/, 'Read free'],
]

/**
 * Parses the "where to find it" answer.
 *
 * One per line, either "Kind: Label — URL" or just "Label — URL". Google
 * Forms cannot repeat a group of fields, so a paragraph with a stated format
 * beats several fixed rows that mostly sit empty.
 *
 * An unstated kind is inferred from the host where that is unambiguous, and
 * defaults to Buy otherwise — the most common case, and the one whose
 * consequence if wrong is mildest.
 */
function parseLinks(answer, { kinds }) {
  return (answer ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      let rest = line
      let kind = null

      const prefixed = line.match(/^([A-Za-z ]+):\s*(.+)$/)
      if (prefixed) {
        const candidate = kinds.find((k) => k.toLowerCase() === prefixed[1].trim().toLowerCase())
        if (candidate) {
          kind = candidate
          rest = prefixed[2]
        }
      }

      const [rawLabel, ...tail] = rest.split(/\s+[—–-]\s+/)
      const url = (tail.join(' — ') || rawLabel).trim()
      if (!/^https?:\/\//.test(url)) return null

      let host = ''
      try {
        host = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return null
      }

      if (!kind) {
        kind = KIND_BY_HOST.find(([pattern]) => pattern.test(host))?.[1] ?? 'Buy'
      }

      const label = tail.length ? rawLabel.trim() : host
      return { _type: 'bookLink', _key: `link${i}`, kind, label, url }
    })
    .filter(Boolean)
}

async function main() {
  const [, , csvPath, ...flags] = process.argv
  const commit = flags.includes('--commit')

  if (!csvPath) {
    // The `--` is not optional and not obvious: without it npm swallows the
    // arguments instead of passing them to the script.
    console.error('Usage: npm run import:books -- <csv> [--commit]')
    console.error('   eg: npm run import:books -- data/books.csv')
    console.error('       npm run import:books -- data/books.csv --commit')
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
    //
    // Matched on name OR slug, never on email. Every published Sanity
    // document is readable without auth, so an email stored on a creator is
    // an email published to anyone who runs a GROQ query. The slug is the
    // identifier that is already unique AND already public — it is in the
    // URL — which makes it the right key for a spreadsheet someone fills in
    // by hand.
    const creatorKey = repairText(record.Creator).trim()
    const lower = creatorKey.toLowerCase()

    const bySlug = creators.filter((c) => c.slug?.toLowerCase() === lower)
    const byName = creators.filter((c) => c.name.toLowerCase() === lower)
    const candidates = bySlug.length ? bySlug : byName

    if (candidates.length === 0) {
      warnings.push(
        `${title}: creator "${creatorKey}" is not in the CMS. Add them first, then re-run.`,
      )
      console.log(`   creator "${creatorKey}" not found — skipping\n`)
      continue
    }

    // Two people can share a name; nobody shares a slug. Picking the first
    // match would attribute someone's book to a stranger, and nothing
    // downstream would ever flag it.
    if (candidates.length > 1) {
      const options = candidates.map((c) => c.slug).join(', ')
      warnings.push(
        `${title}: "${creatorKey}" matches ${candidates.length} creators. Use the slug instead — one of: ${options}`,
      )
      console.log(`   creator "${creatorKey}" is ambiguous (${options}) — skipping\n`)
      continue
    }

    const creator = candidates[0]
    console.log(`   creator: ${creator.name}${bySlug.length ? '  (matched by slug)' : ''}`)

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

    // Two column names because the live form says "Where to buy" while this
    // expected "Where to find it". Both are accepted rather than picking a
    // winner — renaming a question on a form that already has responses
    // splits the sheet into two columns, so the importer tolerating both is
    // cheaper than a migration.
    const links = parseLinks(record['Where to find it'] || record['Where to buy'], {
      kinds: LINK_KINDS,
    })

    // The form still asks for a Kickstarter separately, from before links
    // were modelled with kinds. Fold it in as a Back link rather than
    // dropping it — a live campaign is the most time-critical thing a book
    // page can carry.
    const campaign = repairText(record['Kickstarter link'] || '').trim()
    if (campaign.startsWith('http')) {
      links.push({
        _type: 'bookLink',
        _key: `link-campaign`,
        kind: 'Back',
        label: 'Kickstarter',
        url: campaign,
      })
    }
    if (links.length) {
      console.log(`   links: ${links.map((l) => `${l.label} (${l.kind})`).join(', ')}`)
    }

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

    if (links.length) doc.links = links

    const issues = Number.parseInt(record['Issues available'] ?? '', 10)
    if (Number.isInteger(issues) && issues > 0) doc.issueCount = issues

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

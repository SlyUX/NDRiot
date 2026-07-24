#!/usr/bin/env node
/**
 * Imports creator submissions from the intake form's CSV export.
 *
 *   node scripts/import-creators.mjs data/submissions.csv          # dry run
 *   node scripts/import-creators.mjs data/submissions.csv --commit # writes
 *
 * Three rules shape this script:
 *
 *  1. **It only ever writes drafts.** Sanity's draft/publish split is already
 *     the approval queue, so a human reviews and publishes. Nothing here
 *     makes a profile public.
 *
 *  2. **It never overwrites.** Documents are created with createIfNotExists,
 *     so re-running after an editor has corrected something in the Studio
 *     leaves their work alone. Re-running is safe and reports what it skipped.
 *
 *  3. **It fails loudly rather than importing junk.** A dead image URL or a
 *     search-engine thumbnail is reported and skipped, not uploaded. Bad data
 *     imported silently is worse than data not imported.
 *
 * Columns with no home in the schema are listed at the end rather than
 * dropped, so what the form collects and what the site can store stay visibly
 * in step.
 */

import { readFile } from 'node:fs/promises'

import { parseCsv, toRecords } from './lib/csv.mjs'
import { loadToken, mutate, query, uploadImage } from './lib/sanity.mjs'
import {
  GENRES,
  FORMATS,
  MATURITY,
  isYes,
  matchTaxonomy,
  repairText,
  slugify,
  toPortableText,
} from './lib/shared.mjs'

/* -------------------------------------------------------------- the import */

/** Form column → what we do with it. Anything absent here is reported. */
const MAPPED_COLUMNS = new Set([
  'Timestamp',
  'Email Address',
  'Your name',
  'Studio or trading name',
  "Where you're based",
  'Preferred web address',
  'Tell us about your work',
  'Are you open to collaboration?',
  'Your website',
  'Social links',
  'Collectives or organizations you belong to',
  'A photo or avatar of you',
  'Describe that image',
  'Studio or organization logo',
  'Can we publish this?',
  'What do you make?',
  'What genres do you work in?',
  "Who's it for?",
])

/**
 * Columns that intentionally have no Sanity field because something else
 * owns them. Listed so they are not reported as gaps every run, and named so
 * it is obvious where they went if that ever changes.
 */
const HANDLED_ELSEWHERE = new Map([
  ['Want the newsletter?', 'MailerLite — exported from the form separately'],
  ['Do you meet the criteria?', 'review gate, not content'],
])

/**
 * Maps a social URL's host to one of the socialLink `platform` options. Order
 * does not matter — hosts are distinct. Anything unrecognised falls back to
 * "Website": the field is required, a bare domain is usually a personal site,
 * and the value is easy to correct on the draft before publishing.
 */
const PLATFORM_BY_HOST = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(x|twitter)\.com$/, 'X'],
  [/(^|\.)bsky\.(app|social)$/, 'Bluesky'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
]

function platformFor(url) {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'Website'
  }
  return PLATFORM_BY_HOST.find(([pattern]) => pattern.test(host))?.[1] ?? 'Website'
}

/**
 * Organizations are created PUBLISHED, unlike everything else here.
 *
 * This is a deliberate exception to the drafts-only rule, and the alternatives
 * are both worse. Sanity refuses a mutation where a document references one
 * that does not exist, so a draft creator cannot point at a draft-only
 * organization. Making the reference weak sidesteps that check but produces a
 * silent content bug: publish the creator while the organization is still a
 * draft, and the studio simply vanishes from the page with no error anywhere.
 *
 * The rule exists so no profile goes public unreviewed. An organization is a
 * name, a slug and a website — it says nothing about a person, and it is only
 * ever visible through a creator page that is still awaiting review. So
 * publishing one costs nothing and keeps references intact.
 */
async function resolveOrganization(name, { existing, logoUrl, token, commit, created }) {
  const clean = repairText(name).trim()
  if (!clean) return null

  const match = existing.find((o) => o.name.toLowerCase() === clean.toLowerCase())
  if (match) return { _type: 'reference', _ref: match._id, existing: true, name: clean }

  const id = `organization-${slugify(clean)}`
  if (!created.has(id)) {
    const doc = {
      _id: id,
      _type: 'organization',
      name: clean,
      slug: { _type: 'slug', current: slugify(clean) },
    }

    if (logoUrl) {
      const logo = await uploadImage(logoUrl, { token, commit, label: `${slugify(clean)}-logo` })
      if (logo.error) {
        console.log(`   logo for ${clean}: SKIPPED — ${logo.error}`)
      } else if (logo.assetId) {
        doc.logo = { _type: 'imageWithAlt', asset: { _type: 'reference', _ref: logo.assetId } }
        console.log(`   logo for ${clean}: ok (${(logo.bytes / 1024).toFixed(0)}KB)`)
      } else if (logo.dryRun) {
        console.log(`   logo for ${clean}: ok (${(logo.bytes / 1024).toFixed(0)}KB)`)
      }
    }

    created.set(id, { createIfNotExists: doc })
  }
  return { _type: 'reference', _ref: id, existing: false, name: clean }
}

async function main() {
  const [, , csvPath, ...flags] = process.argv
  const commit = flags.includes('--commit')

  if (!csvPath) {
    // The `--` is not optional and not obvious: without it npm swallows the
    // arguments instead of passing them to the script.
    console.error('Usage: npm run import:creators -- <csv> [--commit]')
    console.error('   eg: npm run import:creators -- data/creators.csv')
    console.error('       npm run import:creators -- data/creators.csv --commit')
    process.exit(1)
  }

  const token = await loadToken()
  const raw = await readFile(csvPath, 'utf8')
  const records = toRecords(parseCsv(raw))

  console.log(`\n${commit ? 'IMPORTING' : 'DRY RUN — nothing will be written'}`)
  console.log(`${records.length} submission(s) in ${csvPath}\n`)

  const existingOrgs = await query('*[_type=="organization"]{_id,name}')
  const existingCreators = await query('*[_type=="creator"]{"slug":slug.current}')
  const takenSlugs = new Set(existingCreators.map((c) => c.slug))

  const orgMutations = new Map()
  const mutations = []
  const unmapped = new Set()
  const warnings = []

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!MAPPED_COLUMNS.has(key) && !HANDLED_ELSEWHERE.has(key) && record[key]) unmapped.add(key)
    }

    const name = repairText(record['Your name'])
    if (!name) {
      warnings.push('A row has no name — skipped.')
      continue
    }

    const slug = slugify(record['Preferred web address'] || name)
    console.log(`── ${name}  →  /creators/${slug}`)

    if (takenSlugs.has(slug)) {
      console.log('   already exists in the dataset — skipping\n')
      continue
    }

    if (!isYes(record['Can we publish this?'])) {
      warnings.push(`${name} did not grant publishing permission — skipped.`)
      console.log('   no publishing permission — skipping\n')
      continue
    }

    const bio = repairText(record['Tell us about your work'])
    if (bio !== record['Tell us about your work']) {
      console.log('   repaired mangled characters in the bio')
    }

    const studioRef = await resolveOrganization(record['Studio or trading name'], {
      existing: existingOrgs,
      logoUrl: record['Studio or organization logo'],
      token,
      commit,
      created: orgMutations,
    })
    if (studioRef) {
      console.log(`   studio: ${studioRef.name}${studioRef.existing ? '' : '  (will be created)'}`)
    }

    const orgRefs = []
    for (const orgName of (record['Collectives or organizations you belong to'] || '').split(',')) {
      const ref = await resolveOrganization(orgName, {
        existing: existingOrgs,
        token,
        commit,
        created: orgMutations,
      })
      if (ref && ref._ref !== studioRef?._ref) {
        orgRefs.push({ ...ref, _key: ref._ref })
        console.log(`   member of: ${ref.name}${ref.existing ? '' : '  (will be created)'}`)
      }
    }

    const socials = (record['Social links'] || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s))
      .map((url, i) => ({ _type: 'socialLink', _key: `s${i}`, platform: platformFor(url), url }))
    if (socials.length) console.log(`   socials: ${socials.map((s) => s.platform).join(', ')}`)

    const photo = await uploadImage(record['A photo or avatar of you'], {
      token,
      commit,
      label: `${slug}-photo`,
    })
    if (photo.error) {
      warnings.push(`${name}: photo not imported — ${photo.error}`)
      console.log(`   photo: SKIPPED — ${photo.error}`)
    } else if (photo.assetId || photo.dryRun) {
      console.log(`   photo: ok (${((photo.bytes ?? 0) / 1024).toFixed(0)}KB)`)
    }

    const genreMatch = matchTaxonomy(record['What genres do you work in?'], GENRES)
    const formatMatch = matchTaxonomy(record['What do you make?'], FORMATS)
    const audienceMatch = matchTaxonomy(record["Who's it for?"], MATURITY, { single: true })

    for (const [label, { matched, unknown }] of [
      ['genres', genreMatch],
      ['formats', formatMatch],
      ['audience', audienceMatch],
    ]) {
      if (matched.length) console.log(`   ${label}: ${matched.join(', ')}`)
      if (unknown.length) {
        warnings.push(`${name}: unrecognised ${label} — ${unknown.join(', ')}. Add to taxonomy.ts or correct in the Studio.`)
        console.log(`   ${label}: UNRECOGNISED — ${unknown.join(', ')}`)
      }
    }

    if (genreMatch.matched.length > 3) {
      warnings.push(`${name}: picked ${genreMatch.matched.length} genres; only the first three are kept.`)
    }

    const doc = {
      _id: `drafts.creator-${slug}`,
      _type: 'creator',
      name,
      slug: { _type: 'slug', current: slug },
      openToCollaboration: isYes(record['Are you open to collaboration?']),
    }

    const location = repairText(record["Where you're based"])
    if (location) doc.location = location
    const website = record['Your website']?.trim()
    if (website) doc.website = website
    if (bio) doc.bio = toPortableText(bio)
    if (socials.length) doc.socials = socials
    if (genreMatch.matched.length) doc.genres = genreMatch.matched.slice(0, 3)
    if (formatMatch.matched.length) doc.formats = formatMatch.matched
    if (audienceMatch.matched.length) doc.audience = audienceMatch.matched[0]
    if (studioRef) doc.studio = { _type: 'reference', _ref: studioRef._ref }
    if (orgRefs.length) {
      doc.organizations = orgRefs.map(({ _key, _ref }) => ({ _type: 'reference', _key, _ref }))
    }
    if (photo.assetId) {
      doc.photo = {
        _type: 'imageWithAlt',
        asset: { _type: 'reference', _ref: photo.assetId },
        alt: repairText(record['Describe that image']) || undefined,
      }
    }

    mutations.push({ createIfNotExists: doc })
    console.log('')
  }

  const all = [...orgMutations.values(), ...mutations]
  if (all.length === 0) {
    console.log('No new documents to create.')
  } else {
    const result = await mutate(all, { token, commit })
    console.log(`${commit ? 'Created' : 'Would create'} ${result.results.length} document(s):`)
    for (const r of result.results) console.log(`   ${r.id}`)
  }

  if (warnings.length) {
    console.log('\nNeeds a human:')
    for (const w of warnings) console.log(`   • ${w}`)
  }

  if (unmapped.size) {
    console.log('\nForm columns with nowhere to go in the schema:')
    for (const c of unmapped) console.log(`   • ${c}`)
    console.log('   Either add a field, or drop the question from the form.')
  }

  const present = [...HANDLED_ELSEWHERE].filter(([c]) => records.some((r) => r[c]))
  if (present.length) {
    console.log('\nCollected, handled outside Sanity:')
    for (const [c, where] of present) console.log(`   • ${c} — ${where}`)
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

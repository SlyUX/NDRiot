/**
 * Seed the ownership map (email → creatorId) for creators who already exist.
 *
 * New creators self-establish ownership when they submit the on-site form. This
 * one-off backfills the ones already in Sanity, using the VERIFIED Google email
 * the intake Google Form collected (its "Email Address" column) — the same
 * account they'll sign in with. Those emails were deliberately never stored in
 * the public dataset; this writes them only to the private `ndriot_auth`
 * dataset, keyed by creator id.
 *
 * Matching reuses the importer's rule: slugify(preferred web address || name),
 * matched against existing creators' slugs, then name as a fallback. Anything
 * ambiguous is reported, never guessed.
 *
 * Usage:
 *   node scripts/seed-ownership.mjs data/creators.csv            # dry run
 *   node scripts/seed-ownership.mjs data/creators.csv --commit   # writes
 *   node scripts/seed-ownership.mjs --set you@gmail.com creator-jane --commit
 */
import { readFile } from 'node:fs/promises'

import { createClient } from '@sanity/client'

import { parseCsv, toRecords } from './lib/csv.mjs'
import { API_VERSION, PROJECT_ID, loadToken, query } from './lib/sanity.mjs'
import { repairText, slugify } from './lib/shared.mjs'

const OWNERSHIP_DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

function ownershipDoc(email, creatorId) {
  return {
    _id: `ownership-${creatorId}`,
    _type: 'ownership',
    email: email.trim().toLowerCase(),
    creatorId,
  }
}

async function writeAll(docs, token) {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: OWNERSHIP_DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    token,
  })
  const tx = docs.reduce((t, d) => t.createOrReplace(d), client.transaction())
  await tx.commit()
}

async function main() {
  const [, , first, ...rest] = process.argv
  const commit = rest.includes('--commit') || first === '--set'
  const wantsCommit = process.argv.includes('--commit')

  // Manual single mapping: --set <email> <creatorId>
  if (first === '--set') {
    const [email, creatorId] = rest.filter((a) => a !== '--commit')
    if (!email || !creatorId) {
      console.error('Usage: node scripts/seed-ownership.mjs --set <email> <creatorId> [--commit]')
      process.exit(1)
    }
    console.log(`${wantsCommit ? 'Writing' : 'Would write'}: ${email} → ${creatorId}`)
    if (!wantsCommit) return console.log('\nDry run — add --commit to write.')
    await writeAll([ownershipDoc(email, creatorId)], await loadToken())
    return console.log(`Wrote 1 ownership record to ${OWNERSHIP_DATASET}.`)
  }

  const csvPath = first
  if (!csvPath) {
    console.error('Usage: node scripts/seed-ownership.mjs <form-export.csv> [--commit]')
    process.exit(1)
  }

  const token = await loadToken()
  const records = toRecords(parseCsv(await readFile(csvPath, 'utf8')))
  const creators = await query(
    `*[_type=="creator" && defined(slug.current)]{_id,name,"slug":slug.current}`,
  )
  const bySlug = new Map(creators.map((c) => [c.slug, c]))
  const byName = new Map(creators.map((c) => [(c.name || '').trim().toLowerCase(), c]))

  const matched = []
  const unmatched = []
  for (const r of records) {
    const email = (r['Email Address'] || '').trim()
    if (!email) continue
    const name = repairText(r['Your name'] || '').trim()
    const pref = (r['Preferred web address'] || '').trim()
    const slug = slugify(pref || name)
    const creator = bySlug.get(slug) || byName.get(name.toLowerCase())
    if (creator) matched.push({ email, creator })
    else unmatched.push({ email, name, slug })
  }

  console.log(`\nMatched ${matched.length} · unmatched ${unmatched.length} · of ${records.length} rows\n`)
  for (const m of matched) console.log(`  ✓ ${m.email}  →  ${m.creator.name} (${m.creator._id})`)
  for (const u of unmatched) {
    console.log(`  ✗ UNMATCHED  ${u.name} <${u.email}>  (looked for slug "${u.slug}")`)
  }
  if (unmatched.length) {
    console.log('\n  Connect an unmatched one by hand once you know its creator id:')
    console.log('    node scripts/seed-ownership.mjs --set <email> <creatorId> --commit')
  }

  if (!commit) return console.log('\nDry run — re-run with --commit to write.')
  if (!matched.length) return console.log('\nNothing to write.')
  await writeAll(matched.map((m) => ownershipDoc(m.email, m.creator._id)), token)
  console.log(`\nWrote ${matched.length} ownership records to ${OWNERSHIP_DATASET}.`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

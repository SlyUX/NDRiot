import { API, DATASET, loadToken, mutate } from './lib/sanity.mjs'

/**
 * One-time backfill: populate the new `maturityRating` (+ ratingSource / note,
 * and coverIsMature default) on every book, strip, and update, derived from the
 * legacy `maturity` label. Covers published AND draft docs.
 *
 *   All Ages / Teen / Teen+  ->  allAges | teen
 *   Mature                   ->  mature   (books/updates only; strips cap at teen)
 *
 * Special cases decided with the operator (2026-09-25):
 *   - "Delighted Ghost Comix" (book, unrated) -> teen
 *   - "Still Got it!" (strip, was Mature)     -> teen  (Strips can't be Mature)
 *
 * Dry-run by default; pass --commit to write.
 *
 *   node scripts/backfill-maturity.mjs           # preview
 *   node scripts/backfill-maturity.mjs --commit  # apply
 */

const COMMIT = process.argv.includes('--commit')

const LEGACY_TO_TIER = {
  'All Ages': 'allAges',
  Teen: 'teen',
  'Teen+': 'teen',
  Mature: 'mature',
}

async function authedQuery(groq, token) {
  const url = new URL(`${API}/data/query/${DATASET}`)
  url.searchParams.set('query', groq)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}

/** Decide the tier + source/note for one doc. */
function decide(type, doc) {
  const title = doc.title ?? ''
  if (type === 'book') {
    if (title === 'Delighted Ghost Comix') {
      return { tier: 'teen', source: 'operator', note: 'Assigned during Content Policy migration (was unrated).' }
    }
    const tier = LEGACY_TO_TIER[doc.maturity] ?? 'teen'
    return { tier, source: 'creator' }
  }
  if (type === 'strip') {
    if (title === 'Still Got it!') {
      return { tier: 'teen', source: 'operator', note: 'Re-rated Mature→Teen: Strips are public and cap at Teen (Content Policy).' }
    }
    // Strips cap at teen — any legacy Mature collapses to teen.
    const mapped = LEGACY_TO_TIER[doc.maturity] ?? 'allAges'
    return { tier: mapped === 'mature' ? 'teen' : mapped, source: 'creator' }
  }
  // updates: no legacy maturity; default all-ages (text posts).
  return { tier: 'allAges', source: 'creator' }
}

async function run() {
  const token = await loadToken()
  const types = ['book', 'strip', 'update']
  const mutations = []
  const summary = {}

  for (const type of types) {
    const docs = await authedQuery(
      `*[_type=="${type}"]{_id, title, maturity, maturityRating}`,
      token,
    )
    for (const doc of docs) {
      const { tier, source, note } = decide(type, doc)
      const set = { maturityRating: tier, ratingSource: source }
      if (note) set.ratingNote = note
      if (type === 'book' && doc.coverIsMature === undefined) set.coverIsMature = false
      mutations.push({ patch: { id: doc._id, set } })
      summary[`${type}:${tier}`] = (summary[`${type}:${tier}`] ?? 0) + 1
      const flag = doc.maturityRating ? ' (already had a tier — overwriting)' : ''
      console.log(`  ${type.padEnd(6)} ${tier.padEnd(8)} ${doc.title ?? doc._id}${note ? '  «' + note + '»' : ''}${flag}`)
    }
  }

  console.log('\nSummary:', JSON.stringify(summary))
  console.log(`Total patches: ${mutations.length}`)

  if (!COMMIT) {
    console.log('\nDRY RUN — no changes written. Re-run with --commit to apply.')
    return
  }
  await mutate(mutations, { token, commit: true })
  console.log('\n✅ Committed.')
}

run().catch((e) => {
  console.error('ERR', e.message)
  process.exit(1)
})

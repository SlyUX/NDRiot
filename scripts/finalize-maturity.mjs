import { API, DATASET, loadToken, mutate } from './lib/sanity.mjs'

/**
 * Finalize the maturity merge: one field (`maturityRating`) persists, the legacy
 * `maturity` (Audience) field is retired. Two phases, run either side of the
 * code deploy so there is no window where live code reads a field that is gone:
 *
 *   1. --set   : reconcile `maturityRating` = the MORE RESTRICTIVE of the doc's
 *                current `maturityRating` and its legacy `maturity` (mapped to a
 *                tier). Fixes drift (e.g. a book whose Audience said Mature but
 *                whose tier stayed Teen). Leaves the legacy field in place, so
 *                run this BEFORE deploying the new code.
 *   2. --unset : remove the now-orphaned legacy `maturity` field (clears the
 *                Studio "unknown field" warning). Run AFTER the new code is live,
 *                since the old code still read `maturity`.
 *
 * Books + strips only (updates never had a legacy `maturity`). Strips cap at
 * teen — a legacy Mature collapses to teen. Dry-run by default; --commit writes.
 *
 *   node scripts/finalize-maturity.mjs --set            # preview reconcile
 *   node scripts/finalize-maturity.mjs --set --commit   # apply reconcile (pre-deploy)
 *   node scripts/finalize-maturity.mjs --unset --commit # drop legacy (post-deploy)
 */

const COMMIT = process.argv.includes('--commit')
const SET = process.argv.includes('--set')
const UNSET = process.argv.includes('--unset')

if (!SET && !UNSET) {
  console.error('Pass --set (reconcile maturityRating) and/or --unset (drop legacy maturity).')
  process.exit(1)
}

const LEGACY_TO_TIER = { 'All Ages': 'allAges', Teen: 'teen', 'Teen+': 'teen', Mature: 'mature' }
const RANK = { allAges: 0, teen: 1, mature: 2 }

async function authedQuery(groq, token) {
  const url = new URL(`${API}/data/query/${DATASET}`)
  url.searchParams.set('query', groq)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}

/** The more restrictive of two tiers (higher rank wins); null if neither given. */
function mostRestrictive(a, b) {
  const tiers = [a, b].filter((t) => t in RANK)
  if (tiers.length === 0) return null
  return tiers.reduce((x, y) => (RANK[y] > RANK[x] ? y : x))
}

async function run() {
  const token = await loadToken()
  const mutations = []
  const summary = {}

  for (const type of ['book', 'strip']) {
    const docs = await authedQuery(`*[_type=="${type}"]{_id, title, maturity, maturityRating}`, token)
    for (const doc of docs) {
      const patch = { id: doc._id }

      if (SET) {
        const legacyTier = LEGACY_TO_TIER[doc.maturity]
        let next = mostRestrictive(doc.maturityRating, legacyTier)
        if (type === 'strip' && next === 'mature') next = 'teen' // strips cap at teen
        if (next && next !== doc.maturityRating) {
          patch.set = { maturityRating: next, ratingSource: 'operator', ratingNote: 'Maturity-field merge (reconciled from the legacy Audience rating).' }
          summary[`${type}:set:${next}`] = (summary[`${type}:set:${next}`] ?? 0) + 1
          console.log(`  set    ${type.padEnd(5)} ${(doc.maturityRating ?? '∅').padEnd(8)} -> ${next.padEnd(8)} ${doc.title ?? doc._id}`)
        }
      }

      if (UNSET && doc.maturity !== undefined && doc.maturity !== null) {
        patch.unset = ['maturity']
        summary[`${type}:unset`] = (summary[`${type}:unset`] ?? 0) + 1
        console.log(`  unset  ${type.padEnd(5)} legacy "${doc.maturity}" ${doc.title ?? doc._id}`)
      }

      if (patch.set || patch.unset) mutations.push({ patch })
    }
  }

  console.log('\nSummary:', JSON.stringify(summary))
  console.log(`Total patches: ${mutations.length}`)
  if (!COMMIT) {
    console.log('\nDRY RUN — no changes written. Re-run with --commit to apply.')
    return
  }
  if (mutations.length) await mutate(mutations, { token, commit: true })
  console.log('\n✅ Committed.')
}

run().catch((e) => {
  console.error('ERR', e.message)
  process.exit(1)
})

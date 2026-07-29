/**
 * Rename the live "Creator(s)" copy overrides to "Comic Maker(s)".
 *
 * Most creator→comic-maker copy lives in code defaults (site-settings.ts) and
 * ships with a deploy. These four fields are *overridden* in the production
 * siteSettings document, so the code default never reaches them — they have to
 * be patched in the dataset. Each patch is guarded: it only writes when the
 * current value still matches the expected old string, so a value Stephen has
 * since edited in the Studio is left alone rather than clobbered.
 *
 * Usage:
 *   node scripts/rename-creators-copy.mjs           # dry run — shows what would change
 *   node scripts/rename-creators-copy.mjs --commit  # writes
 */
import { createClient } from '@sanity/client'

import { API_VERSION, PROJECT_ID, loadToken, query } from './lib/sanity.mjs'

/** [dotted path, expected current value, new value] */
const CHANGES = [
  ['home.creatorsHeading', 'Creators', 'Comic Makers'],
  ['sections.creatorsHeading', 'Indie Comic Creators', 'Indie Comic Makers'],
  ['sections.creatorFavoritesHeading', '{name}’s Favorite Creators', '{name}’s Favorite Comic Makers'],
  ['sections.searchCreatorsLabel', 'Search Creators', 'Search Comic Makers'],
]

async function main() {
  const commit = process.argv.includes('--commit')
  const token = await loadToken()

  const current = await query(
    `*[_id=="siteSettings"][0]{ ${CHANGES.map((_, i) => `"v${i}": ${CHANGES[i][0]}`).join(',')} }`,
  )
  if (!current) {
    console.error('No siteSettings document found.')
    process.exit(1)
  }

  const setOps = {}
  console.log(`\n${commit ? 'Patching' : 'Would patch'} siteSettings copy:\n`)
  CHANGES.forEach(([path, expected, next], i) => {
    const now = current[`v${i}`]
    if (now === next) {
      console.log(`  = ${path}: already "${next}"`)
    } else if (now === expected) {
      console.log(`  ~ ${path}: "${now}"  →  "${next}"`)
      setOps[path] = next
    } else {
      console.log(`  ! ${path}: "${now ?? '(unset)'}" — not the expected "${expected}", skipping`)
    }
  })

  const n = Object.keys(setOps).length
  if (n === 0) {
    console.log('\nNothing to change.')
    return
  }
  if (!commit) {
    console.log(`\nDry run — re-run with --commit to write ${n} field(s).`)
    return
  }

  const prod = createClient({ projectId: PROJECT_ID, dataset: 'production', apiVersion: API_VERSION, useCdn: false, token })
  await prod.patch('siteSettings').set(setOps).commit()
  console.log(`\nPatched ${n} field(s) on siteSettings.`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

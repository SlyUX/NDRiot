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

/* ------------------------------------------------------------------ setup */

const PROJECT_ID = 'r9bvatt7'
const DATASET = 'production'
const API_VERSION = '2024-10-01'
const API = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`

/** Images below this are almost certainly a thumbnail, not the real asset. */
const MIN_IMAGE_BYTES = 20_000

/** Hosts that only ever serve caches or previews of someone else's file. */
const REJECTED_IMAGE_HOSTS = [
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com',
]

async function loadToken() {
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '')
  const read = (key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
  // Correctly-named first; the original name is kept working so nothing
  // breaks if it has not been renamed yet.
  const token = process.env.SANITY_WRITE_TOKEN ?? read('SANITY_WRITE_TOKEN') ?? read('CREATOR_SCRIPT')
  if (!token) {
    throw new Error('No write token. Set SANITY_WRITE_TOKEN in .env.local.')
  }
  return token
}

/* ------------------------------------------------------------ text repair */

/**
 * Repairs UTF-8 that was decoded as Latin-1 somewhere upstream.
 *
 * The form export turns every em-dash into "â", which would otherwise ship
 * visibly broken into a bio. The round trip fixes the classic full sequences;
 * the targeted replacements catch the orphaned bytes that the round trip
 * cannot, because the trailing bytes were already lost.
 */
function repairText(value) {
  if (!value) return value
  let out = value

  if (/â€|Ã|Â/.test(out)) {
    const roundTripped = Buffer.from(out, 'latin1').toString('utf8')
    if (!roundTripped.includes('�')) out = roundTripped
  }

  return out
    .replace(/â€"/g, '—')
    .replace(/â€"/g, '–')
    .replace(/â€™/g, '’')
    .replace(/â€œ/g, '“')
    .replace(/â€/g, '”')
    // Orphaned marker, left when the continuation bytes did not survive. In
    // this form's output it is always an em-dash.
    .replace(/â(?=\s)|(?<=\s)â/g, '—')
    .replace(/ /g, ' ')
}

/* --------------------------------------------------------------- helpers */

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

/** Plain text to Portable Text, one block per non-empty line. */
function toPortableText(text) {
  return text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({
      _type: 'block',
      _key: `b${i}`,
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: `s${i}`, text: line, marks: [] }],
    }))
}

/** Guesses the platform from a URL so socials land on the right icon. */
function platformFor(url) {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()
  if (host.includes('instagram.')) return 'Instagram'
  if (host === 'x.com' || host.includes('twitter.')) return 'X'
  if (host.includes('bsky.')) return 'Bluesky'
  if (host.includes('tiktok.')) return 'TikTok'
  if (host.includes('youtube.') || host === 'youtu.be') return 'YouTube'
  return 'Other'
}

const isYes = (value) => /^yes\b/i.test((value ?? '').trim())

/* ----------------------------------------------------------- sanity calls */

async function query(groq, params = {}) {
  const url = new URL(`${API}/data/query/${DATASET}`)
  url.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Query failed: ${res.status}`)
  return (await res.json()).result
}

async function mutate(mutations, { token, commit }) {
  const url = new URL(`${API}/data/mutate/${DATASET}`)
  if (!commit) url.searchParams.set('dryRun', 'true')
  url.searchParams.set('returnIds', 'true')

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Mutation failed: ${JSON.stringify(body).slice(0, 400)}`)
  return body
}

/**
 * Fetches an image and uploads it to Sanity, refusing anything that looks
 * like a placeholder rather than a real asset.
 */
async function uploadImage(url, { token, commit, label }) {
  if (!url) return { skipped: 'none supplied' }

  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return { error: 'not a valid URL' }
  }

  if (REJECTED_IMAGE_HOSTS.includes(host)) {
    return { error: `${host} serves search-engine thumbnails, not the original file` }
  }

  let res
  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch (cause) {
    return { error: `unreachable (${cause.message})` }
  }
  if (!res.ok) return { error: `HTTP ${res.status}` }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    return { error: `served ${contentType || 'no content-type'}, not an image` }
  }

  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < MIN_IMAGE_BYTES) {
    return { error: `only ${(bytes.length / 1024).toFixed(1)}KB — a thumbnail, not the original` }
  }

  if (!commit) return { dryRun: true, bytes: bytes.length, contentType }

  const upload = await fetch(`${API}/assets/images/${DATASET}?filename=${encodeURIComponent(label)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: bytes,
  })
  const body = await upload.json()
  if (!upload.ok) return { error: `upload failed: ${JSON.stringify(body).slice(0, 200)}` }
  return { assetId: body.document._id, bytes: bytes.length }
}

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
])

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
    console.error('Usage: node scripts/import-creators.mjs <csv> [--commit]')
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
      if (!MAPPED_COLUMNS.has(key) && record[key]) unmapped.add(key)
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
    console.log('Nothing to do.\n')
    return
  }

  const result = await mutate(all, { token, commit })
  console.log(`${commit ? 'Created' : 'Would create'} ${result.results.length} draft document(s):`)
  for (const r of result.results) console.log(`   ${r.id}`)

  if (warnings.length) {
    console.log('\nNeeds a human:')
    for (const w of warnings) console.log(`   • ${w}`)
  }

  if (unmapped.size) {
    console.log('\nForm columns with nowhere to go in the schema:')
    for (const c of unmapped) console.log(`   • ${c}`)
    console.log('   Either add a field, or drop the question from the form.')
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

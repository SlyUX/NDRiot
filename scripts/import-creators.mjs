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
 *  2. **It edits into drafts, never over live content.** New profiles are
 *     created with createIfNotExists. A form-marked update ("I'm updating my
 *     existing profile", plus the profile picked from a synced dropdown)
 *     overwrites only the fields the creator resubmitted — but onto a review
 *     draft seeded from the live doc, so a human still approves it and untouched
 *     fields are preserved. A "new" submission that collides with an existing
 *     profile is refused, not duplicated. Re-running is safe and reports skips.
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
  // The update gate: a "New / Update" choice, and — when Update — the existing
  // profile the form had them pick from a synced dropdown. Together these route
  // a resubmission onto the real record instead of forking a new one.
  'Is this an update to an existing profile?',
  'Which profile are you updating?',
  'Your name',
  'Studio or trading name',
  // Follow-up to the (now synced) studio dropdown, for a studio not yet listed.
  'Studio or organization name (if not listed)',
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
  'Where can people get your books?',
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
  const clean = repairText(name || '').trim()
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

/**
 * The existing creator an "update" submission points at, matched by the profile
 * the form had them select from a synced dropdown.
 *
 * Matching is by name because that is what the dropdown offers, and it returns
 * the creator's real `_id` — so the edit lands on the actual record whether its
 * id is a `creator-<slug>` (import-made) or a bare UUID (hand-made in Studio).
 * Never re-derive identity from a typed name: that is exactly how a second
 * "Joseph B Christy" got created. Ambiguity (two creators, one name) is
 * surfaced, not guessed at.
 */
function resolveUpdateTarget(selected, existingCreators) {
  const clean = repairText(selected || '').trim()
  if (!clean) return { marked: false }
  const key = clean.toLowerCase()
  const matches = existingCreators.filter((c) => (c.name || '').trim().toLowerCase() === key)
  if (matches.length === 1) return { marked: true, target: matches[0], selected: clean }
  return { marked: true, target: null, ambiguous: matches.length > 1, selected: clean }
}

async function main() {
  const [, , csvPath, ...flags] = process.argv
  const commit = flags.includes('--commit')
  // --update: instead of skipping creators that already exist, backfill their
  // EMPTY fields into a review draft. Never overwrites a value already set (in
  // the Studio or otherwise) — it uses setIfMissing, so editing is always safe.
  const update = flags.includes('--update')

  if (!csvPath) {
    // The `--` is not optional and not obvious: without it npm swallows the
    // arguments instead of passing them to the script.
    console.error('Usage: npm run import:creators -- <csv> [--commit] [--update]')
    console.error('   eg: npm run import:creators -- data/creators.csv')
    console.error('       npm run import:creators -- data/creators.csv --commit')
    console.error('       npm run import:creators -- data/creators.csv --update --commit')
    console.error('')
    console.error('   --update backfills empty fields of existing creators into a')
    console.error('   review draft (never overwrites); without it, existing creators are skipped.')
    process.exit(1)
  }

  const token = await loadToken()
  const raw = await readFile(csvPath, 'utf8')
  const records = toRecords(parseCsv(raw))

  console.log(`\n${commit ? 'IMPORTING' : 'DRY RUN — nothing will be written'}${update ? ' (update mode)' : ''}`)
  console.log(`${records.length} submission(s) in ${csvPath}\n`)

  const existingOrgs = await query('*[_type=="organization"]{_id,name}')
  // Identity of every existing creator — to match an "update" onto its real
  // record, and to catch a "new" submission that collides with someone already
  // here. Drafts excluded: a review draft is not yet a real profile.
  const existingCreators = await query(
    '*[_type=="creator" && !(_id in path("drafts.**"))]{_id,name,"slug":slug.current}',
  )
  const takenSlugs = new Set(existingCreators.map((c) => c.slug))

  const UPDATE_SELECT = 'Which profile are you updating?'
  const anyUpdates = records.some((r) => (r[UPDATE_SELECT] || '').trim())

  // Full PUBLISHED creator docs, needed to seed a review draft that is a true
  // copy of what is live (so publishing the edit does not drop untouched
  // fields). Fetched only when something will actually use them — a --update
  // backfill, or any form-marked update in the CSV. Keyed by both _id (the edit
  // path matches on identity) and slug (the legacy backfill still keys on slug).
  const publishedById =
    update || anyUpdates
      ? new Map(
          (await query('*[_type=="creator" && !(_id in path("drafts.**"))]')).map((c) => [c._id, c]),
        )
      : new Map()
  const publishedBySlug = new Map([...publishedById.values()].map((c) => [c.slug?.current, c]))

  const orgMutations = new Map()
  const mutations = []
  const unmapped = new Set()
  const warnings = []

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!MAPPED_COLUMNS.has(key) && !HANDLED_ELSEWHERE.has(key) && record[key]) unmapped.add(key)
    }

    const { marked: markedUpdate, target: updateTarget, ambiguous, selected } = resolveUpdateTarget(
      record[UPDATE_SELECT],
      existingCreators,
    )

    // Said "update" but the pick does not line up with a real profile. Do not
    // fall back to creating one — that is the failure we are closing.
    if (markedUpdate && !updateTarget) {
      const why = ambiguous ? 'more than one creator has that name' : 'no creator by that name'
      warnings.push(`Update points at "${selected}" (${why}) — skipped. Fix the selection.`)
      console.log(`── update → ${selected}: NO MATCH — skipping\n`)
      continue
    }

    const name = repairText(record['Your name'])
    // On a new submission the name is the identity, so it is required. On an
    // update the matched profile is the identity, so a blank name just means
    // "leave my name as it is".
    if (!name && !updateTarget) {
      warnings.push('A row has no name — skipped.')
      continue
    }

    // Identity comes from the matched profile on an update, and only from the
    // typed name/address on a new submission.
    const slug = updateTarget ? updateTarget.slug : slugify(record['Preferred web address'] || name)
    // The real document id — a matched profile's own id (UUID or otherwise),
    // an existing creator's id when backfilling, or a fresh deterministic id for
    // a genuinely new one. Never assume `creator-<slug>` for a doc made by hand.
    const targetId = updateTarget
      ? updateTarget._id
      : (existingCreators.find((c) => c.slug === slug)?._id ?? `creator-${slug}`)
    const displayName = updateTarget ? updateTarget.name : name
    console.log(`── ${displayName}  →  /creators/${slug}${updateTarget ? '  (update)' : ''}`)

    const exists = takenSlugs.has(slug)

    // Submitted as new, but the address is already taken. Neither create a
    // duplicate nor silently overwrite — flag it. --update still allows the
    // legacy backfill for CSVs that predate the update question.
    if (!updateTarget && exists && !update) {
      warnings.push(
        `${name}: a profile already exists at /creators/${slug}, but this came in as new — skipped. If it is an update, use the update option on the form.`,
      )
      console.log('   already exists (submitted as new) — skipping\n')
      continue
    }
    const published = updateTarget ? publishedById.get(targetId) : publishedBySlug.get(slug)

    // Publishing permission gates a NEW profile going public. An update edits a
    // profile that is already approved and only ever writes a review draft, so
    // it does not re-ask.
    if (!updateTarget && !isYes(record['Can we publish this?'])) {
      warnings.push(`${name} did not grant publishing permission — skipped.`)
      console.log('   no publishing permission — skipping\n')
      continue
    }

    const bio = repairText(record['Tell us about your work'])
    if (bio !== record['Tell us about your work']) {
      console.log('   repaired mangled characters in the bio')
    }

    // The studio question is a synced dropdown of existing orgs plus a "not
    // listed" escape; when they take the escape, the real name is in the
    // follow-up. Matching an existing name here (case-insensitive, all orgs
    // including hand-made UUID ones — see resolveOrganization) is what stops a
    // second "PiP Publishing" beside "PiP Comics Collective".
    let studioName = repairText(record['Studio or trading name'] || '').trim()
    if (/not listed|isn.?t listed/i.test(studioName)) {
      studioName = repairText(record['Studio or organization name (if not listed)'] || '').trim()
    }
    const studioRef = await resolveOrganization(studioName, {
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

    // "Title  https://…" per line — the creator's works and where to get them.
    // Title is everything before the first URL; the URL runs to whitespace.
    const works = (record['Where can people get your books?'] || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .map((line, i) => {
        const match = line.match(/^(.*?)\s*(https?:\/\/\S+)\s*$/)
        if (!match) return null
        const [, label, url] = match
        return { _type: 'workLink', _key: `w${i}`, label: label.trim() || url, url }
      })
      .filter(Boolean)
    if (works.length) console.log(`   works: ${works.map((w) => w.label).join(', ')}`)

    // Upload a photo only when one was actually provided. A blank on an update
    // means "keep my current photo", so there is nothing to fetch. In the
    // legacy backfill, a creator who already has a photo keeps it. But a
    // form-marked update that DID supply a new photo replaces the old one —
    // that is the point of an edit.
    const photoUrl = repairText(record['A photo or avatar of you'] || '').trim()
    let photo
    if (!photoUrl) {
      photo = { skipped: 'no photo provided' }
    } else if (!updateTarget && exists && published?.photo) {
      photo = { skipped: 'creator already has a photo' }
    } else {
      photo = await uploadImage(photoUrl, { token, commit, label: `${slug}-photo` })
    }
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
      _id: `drafts.${targetId}`,
      _type: 'creator',
      name: name || displayName,
      slug: { _type: 'slug', current: slug },
    }
    // Record a collaboration answer for a new profile always, but on an update
    // only when the question was actually answered — otherwise a blank would
    // silently flip an existing "yes" to "no".
    if (!updateTarget || repairText(record['Are you open to collaboration?'] || '').trim()) {
      doc.openToCollaboration = isYes(record['Are you open to collaboration?'])
    }

    const location = repairText(record["Where you're based"])
    if (location) doc.location = location
    const website = record['Your website']?.trim()
    if (website) doc.website = website
    if (bio) doc.bio = toPortableText(bio)
    if (socials.length) doc.socials = socials
    if (works.length) doc.works = works
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

    // Form-marked update: set only the fields this submission actually provided
    // onto the real profile's review draft, leaving everything else as it is
    // live. An edit, not a rewrite — and still a draft, so a human reviews it
    // before anything goes public.
    if (updateTarget) {
      const draftId = `drafts.${targetId}`
      const IDENTITY = new Set(['_id', '_type', 'name', 'slug'])
      const edits = {}
      for (const [key, value] of Object.entries(doc)) {
        if (!IDENTITY.has(key)) edits[key] = value
      }

      if (Object.keys(edits).length === 0) {
        console.log('   nothing to change — no new answers provided\n')
        continue
      }

      // Seed the draft as a faithful copy of the live doc so publishing the edit
      // never drops an untouched field; then overwrite just the provided ones.
      let seed
      if (published) {
        seed = { ...published, _id: draftId }
        delete seed._rev
        delete seed._createdAt
        delete seed._updatedAt
      } else {
        seed = { _id: draftId, _type: 'creator', name: displayName, slug: { _type: 'slug', current: slug } }
      }

      mutations.push({ createIfNotExists: seed })
      mutations.push({ patch: { id: draftId, set: edits } })
      console.log(`   edit → draft: ${Object.keys(edits).join(', ')}\n`)
      continue
    }

    if (exists) {
      // --update: backfill only the fields the live creator is missing, into a
      // review draft. setIfMissing never overwrites, so Studio edits are safe.
      const draftId = `drafts.${targetId}`
      // Identity fields are never backfilled — everything else the row built is
      // a candidate, kept only where the live doc has nothing.
      const IDENTITY = new Set(['_id', '_type', 'name', 'slug'])
      const backfill = {}
      for (const [key, value] of Object.entries(doc)) {
        if (IDENTITY.has(key)) continue
        const current = published?.[key]
        const empty =
          current == null || (Array.isArray(current) && current.length === 0) || current === ''
        if (empty) backfill[key] = value
      }

      if (Object.keys(backfill).length === 0) {
        console.log('   already complete — nothing to backfill\n')
        continue
      }

      // Seed the draft as a true copy of the published doc (so publishing it
      // does not drop existing fields), only if no draft is already in progress.
      // Then fill the gaps. When there is no published doc (draft-only creator),
      // the stub seed is a harmless no-op — the draft already exists.
      let seed
      if (published) {
        seed = { ...published, _id: draftId }
        // Drop Sanity's system fields — a createIfNotExists carrying a stale
        // _rev is rejected, and the timestamps are the destination's to set.
        delete seed._rev
        delete seed._createdAt
        delete seed._updatedAt
      } else {
        seed = { _id: draftId, _type: 'creator', name, slug: { _type: 'slug', current: slug } }
      }

      mutations.push({ createIfNotExists: seed })
      mutations.push({ patch: { id: draftId, setIfMissing: backfill } })
      console.log(`   backfill → draft: ${Object.keys(backfill).join(', ')}\n`)
      continue
    }

    mutations.push({ createIfNotExists: doc })
    console.log('')
  }

  const all = [...orgMutations.values(), ...mutations]
  if (all.length === 0) {
    console.log(update ? 'Nothing to create or backfill.' : 'No new documents to create.')
  } else {
    const result = await mutate(all, { token, commit })
    const verb = commit ? 'Wrote' : 'Would write'
    console.log(`${verb} ${result.results.length} mutation(s)${update ? ' (creates + backfill drafts)' : ''}:`)
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

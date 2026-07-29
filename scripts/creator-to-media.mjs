/**
 * Reclassify a creator document as a `media` outlet.
 *
 * A media outlet that registered as a Creator by mistake can't be retyped in
 * the Studio — Sanity documents don't change `_type`. This reads the creator,
 * builds an equivalent `media` document (bio → about, works + socials → links,
 * photo → logo, genres → genresCovered), publishes it, deletes the creator
 * (published + draft), and re-keys its ownership record so the same person can
 * still manage it.
 *
 * Usage:
 *   node scripts/creator-to-media.mjs <creator-slug-or-id> --kind Podcast            # dry run
 *   node scripts/creator-to-media.mjs <creator-slug-or-id> --kind Podcast --commit   # writes
 */
import { createClient } from '@sanity/client'

import { API_VERSION, PROJECT_ID, loadToken, query } from './lib/sanity.mjs'
import { slugify } from './lib/shared.mjs'

const MEDIA_KINDS = ['Podcast', 'YouTube', 'Review Site', 'Newsletter']
const OWNERSHIP_DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'

async function main() {
  const [, , ident, ...flags] = process.argv
  const commit = flags.includes('--commit')
  const kind = flags.includes('--kind') ? flags[flags.indexOf('--kind') + 1] : null

  if (!ident || !kind) {
    console.error('Usage: node scripts/creator-to-media.mjs <creator-slug-or-id> --kind <Kind> [--commit]')
    console.error(`  --kind must be one of: ${MEDIA_KINDS.join(', ')}`)
    process.exit(1)
  }
  if (!MEDIA_KINDS.includes(kind)) {
    console.error(`Unknown kind "${kind}". One of: ${MEDIA_KINDS.join(', ')}`)
    process.exit(1)
  }

  const token = await loadToken()

  const creator = await query(
    `*[_type=="creator" && (slug.current==$id || _id==$id)][0]{
      _id,name,"slug":slug.current,"bioText":pt::text(bio),photo,genres,
      works[]{label,url}, socials[]{platform,url},
      "bookCount": count(*[_type=="book" && references(^._id)])
    }`,
    { id: ident },
  )
  if (!creator) {
    console.error(`No creator found for "${ident}".`)
    process.exit(1)
  }
  if (creator.bookCount > 0) {
    console.error(
      `"${creator.name}" has ${creator.bookCount} book(s) referencing it — those would be orphaned. Move or delete them first, then re-run.`,
    )
    process.exit(1)
  }

  const mslug = slugify(creator.slug || creator.name)
  const mediaId = `media-${mslug}`

  const links = []
  for (const w of creator.works ?? []) {
    if (w.url) links.push({ _type: 'mediaLink', _key: `l${links.length}`, label: w.label || '', url: w.url })
  }
  for (const s of creator.socials ?? []) {
    if (s.url) links.push({ _type: 'mediaLink', _key: `l${links.length}`, label: s.platform || '', url: s.url })
  }

  const media = {
    _id: mediaId,
    _type: 'media',
    name: creator.name,
    slug: { _type: 'slug', current: mslug },
    kind,
    ...(creator.bioText ? { about: creator.bioText } : {}),
    ...(creator.photo ? { logo: creator.photo } : {}),
    ...(creator.genres?.length ? { genresCovered: creator.genres } : {}),
    ...(links.length ? { links } : {}),
  }

  console.log(`\n${commit ? 'Reclassifying' : 'Would reclassify'}: ${creator.name}`)
  console.log(`  creator ${creator._id} (/creators/${creator.slug})  →  media ${mediaId} (/media/${mslug}), kind "${kind}"`)
  console.log(`  carried: about ${media.about ? '✓' : '—'}, logo ${media.logo ? '✓' : '—'}, genres ${(creator.genres ?? []).length}, links ${links.length}`)

  if (!commit) {
    console.log('\nDry run — re-run with --commit to write.')
    return
  }

  const prod = createClient({ projectId: PROJECT_ID, dataset: 'production', apiVersion: API_VERSION, useCdn: false, token })
  await prod
    .transaction()
    .createOrReplace(media)
    .delete(creator._id)
    .delete(`drafts.${creator._id}`)
    .commit()
  console.log(`\nWrote media ${mediaId}, deleted creator ${creator._id} (+ draft).`)

  // Re-key ownership (ndriot_auth): whoever owned the creator now owns the media.
  const auth = createClient({ projectId: PROJECT_ID, dataset: OWNERSHIP_DATASET, apiVersion: API_VERSION, useCdn: false, token })
  const owner = await auth.fetch(`*[_id==$id][0].email`, { id: `ownership-${creator._id}` })
  if (owner) {
    await auth
      .transaction()
      .createOrReplace({ _id: `ownership-${mediaId}`, _type: 'ownership', email: owner, creatorId: mediaId })
      .delete(`ownership-${creator._id}`)
      .commit()
    console.log(`  re-keyed ownership: ${owner} now owns ${mediaId}.`)
  } else {
    console.log('  no ownership record found for the creator — nothing to re-key.')
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

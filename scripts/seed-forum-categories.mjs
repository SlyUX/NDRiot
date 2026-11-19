#!/usr/bin/env node
/**
 * Seeds the forum's boards (forumBoard) into the PRIVATE `ndriot_auth`
 * dataset.
 *
 *   node scripts/seed-forum-categories.mjs           # dry run
 *   node scripts/seed-forum-categories.mjs --commit  # writes
 *
 * Idempotent: each board has a deterministic id (`forumboard.<slug>`) and is
 * written with `createIfNotExists`, so re-running never clobbers edits made in
 * Studio — it only fills in boards that don't exist yet. Editors own the titles,
 * descriptions, and order after the first seed.
 */

import { readFile } from 'node:fs/promises'

const PROJECT_ID = 'r9bvatt7'
const DATASET = process.env.SANITY_OWNERSHIP_DATASET ?? 'ndriot_auth'
const API_VERSION = '2024-10-01'
const API = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`

/** The 9 beta boards, in editorial order (§3 — order is fixed, not by activity). */
const BOARDS = [
  {
    slug: 'announcements',
    title: 'Announcements',
    description: 'ND Riot news, platform updates, and the house rules.',
    order: 1,
    adminOnlyPosts: true,
  },
  {
    slug: 'collab',
    title: 'Collab',
    description:
      'Find co-creators — writers seeking artists, artists seeking writers, letterers, colorists, editors.',
    order: 2,
    adminOnlyPosts: false,
  },
  {
    slug: 'the-drawing-board',
    title: 'The Drawing Board',
    description: 'Post pages, scripts, covers, and logos for honest feedback.',
    order: 3,
    adminOnlyPosts: false,
  },
  {
    slug: 'shop-talk',
    title: 'Shop Talk',
    description: 'The craft itself — tools, software, lettering, printing, the actual making.',
    order: 4,
    adminOnlyPosts: false,
  },
  {
    slug: 'inspiration',
    title: 'Inspiration',
    description: 'The stuff that lights the fire — comics, art, film, music, references, recommendations.',
    order: 5,
    adminOnlyPosts: false,
  },
  {
    slug: 'conventions',
    title: 'Conventions',
    description: "Con reports, table tips, travel, and who's tabling where.",
    order: 6,
    adminOnlyPosts: false,
  },
  {
    slug: 'spinner-racks',
    title: 'Spinner Racks',
    description: 'Getting into shops, selling, and self-distribution.',
    order: 7,
    adminOnlyPosts: false,
  },
  {
    slug: 'show-and-tell',
    title: 'Show & Tell',
    description: 'New releases and work-in-progress — share what you’re making.',
    order: 8,
    adminOnlyPosts: false,
  },
  {
    slug: 'the-back-room',
    title: 'The Back Room',
    description: 'Everything else. Off-topic, hanging out, the indie-comics world at large.',
    order: 9,
    adminOnlyPosts: false,
  },
]

async function loadToken() {
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '')
  const read = (key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
  const token =
    process.env.SANITY_WRITE_TOKEN ?? read('SANITY_WRITE_TOKEN') ?? read('CREATOR_SCRIPT')
  if (!token) throw new Error('No write token. Set SANITY_WRITE_TOKEN in .env.local.')
  return token
}

async function main() {
  const commit = process.argv.includes('--commit')
  const token = await loadToken()

  const mutations = BOARDS.map((b) => ({
    createIfNotExists: {
      _id: `forumboard.${b.slug}`,
      _type: 'forumBoard',
      title: b.title,
      slug: { _type: 'slug', current: b.slug },
      description: b.description,
      order: b.order,
      adminOnlyPosts: b.adminOnlyPosts,
    },
  }))

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

  console.log(
    `${commit ? 'Committed' : 'Dry run'} — ${BOARDS.length} boards into ${DATASET}:`,
  )
  for (const b of BOARDS) console.log(`  #${b.order} ${b.title} (/forum/${b.slug})`)
  if (!commit) console.log('\nRe-run with --commit to write.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

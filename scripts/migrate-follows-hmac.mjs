import { readFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'

/**
 * One-time migration of reader saves (follows) in the private ndriot_auth
 * dataset to the HMAC scheme:
 *   - key `_id` becomes `save.<HMAC(email::itemId)>` (was a guessable
 *     sha256(email::itemId)),
 *   - the doc stores `emailHmac` (HMAC of the email) instead of the plaintext
 *     `email`.
 *
 * Because the old docs STORED the plaintext email, we can recompute every key
 * directly — no dual-read window needed. Idempotent: a doc that already has
 * `emailHmac` is skipped.
 *
 * Dry-run by default; pass --commit to write.
 *   node scripts/migrate-follows-hmac.mjs
 *   node scripts/migrate-follows-hmac.mjs --commit
 */

const COMMIT = process.argv.includes('--commit')

async function env() {
  const raw = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '')
  const read = (k) =>
    process.env[k] ?? raw.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim()
  const projectId = read('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const apiVersion = read('NEXT_PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'
  const dataset = read('SANITY_OWNERSHIP_DATASET') ?? 'ndriot_auth'
  const token = read('SANITY_WRITE_TOKEN') ?? read('CREATOR_SCRIPT')
  const secret = read('ND_RIOT_HASH_SECRET')
  if (!projectId || !token) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID / SANITY_WRITE_TOKEN')
  if (!secret) throw new Error('Missing ND_RIOT_HASH_SECRET')
  return { projectId, apiVersion, dataset, token, secret }
}

const normalize = (e) => e.trim().toLowerCase()
const emailHmac = (e, secret) => createHmac('sha256', secret).update(normalize(e)).digest('hex')
const saveHmac = (e, itemId, secret) =>
  createHmac('sha256', secret).update(`${normalize(e)}::${itemId}`).digest('hex')

async function run() {
  const { projectId, apiVersion, dataset, token, secret } = await env()
  const API = `https://${projectId}.api.sanity.io/v${apiVersion}`
  const auth = { Authorization: `Bearer ${token}` }

  const url = new URL(`${API}/data/query/${dataset}`)
  url.searchParams.set('query', `*[_type=="readerSave"]{_id, email, emailHmac, itemType, itemId}`)
  const res = await fetch(url, { headers: auth })
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`)
  const docs = (await res.json()).result ?? []

  const mutations = []
  let migrate = 0
  let already = 0
  let malformed = 0
  for (const d of docs) {
    if (d.emailHmac) { already += 1; continue }
    if (!d.email || !d.itemId) { malformed += 1; console.log('  ! malformed (skipped):', d._id); continue }
    const newId = `save.${saveHmac(d.email, d.itemId, secret)}`
    mutations.push({
      createOrReplace: { _id: newId, _type: 'readerSave', emailHmac: emailHmac(d.email, secret), itemType: d.itemType, itemId: d.itemId },
    })
    if (d._id !== newId) mutations.push({ delete: { id: d._id } })
    migrate += 1
    console.log(`  migrate ${d._id}  ->  ${newId}  (${d.itemType})`)
  }

  console.log(`\nreaderSave docs: ${docs.length} | to migrate: ${migrate} | already HMAC: ${already} | malformed: ${malformed}`)

  if (!COMMIT) {
    console.log('\nDRY RUN — no changes written. Re-run with --commit to apply.')
    return
  }
  if (mutations.length === 0) { console.log('Nothing to do.'); return }
  const mres = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  const body = await mres.json()
  if (!mres.ok) throw new Error(`Mutation failed: ${JSON.stringify(body).slice(0, 400)}`)
  console.log('\n✅ Committed.')
}

run().catch((e) => { console.error('ERR', e.message); process.exit(1) })

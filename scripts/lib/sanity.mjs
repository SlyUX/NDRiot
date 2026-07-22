import { readFile } from 'node:fs/promises'

/**
 * Sanity access shared by the import scripts.
 *
 * Plain Node, not the app: these run outside Next, so they cannot use the
 * project's client or its TypeScript modules.
 */

export const PROJECT_ID = 'r9bvatt7'
export const DATASET = 'production'
export const API_VERSION = '2024-10-01'
export const API = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`

/** Images below this are almost certainly a thumbnail, not the real asset. */
const MIN_IMAGE_BYTES = 20_000

/** Hosts that only ever serve caches or previews of someone else's file. */
const REJECTED_IMAGE_HOSTS = [
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com',
]

export async function loadToken() {
  const env = await readFile(new URL('../../.env.local', import.meta.url), 'utf8').catch(() => '')
  const read = (key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
  const token =
    process.env.SANITY_WRITE_TOKEN ?? read('SANITY_WRITE_TOKEN') ?? read('CREATOR_SCRIPT')
  if (!token) throw new Error('No write token. Set SANITY_WRITE_TOKEN in .env.local.')
  return token
}

export async function query(groq, params = {}) {
  const url = new URL(`${API}/data/query/${DATASET}`)
  url.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Query failed: ${res.status}`)
  return (await res.json()).result
}

export async function mutate(mutations, { token, commit }) {
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
 * Google Forms file-upload answers arrive as Drive links, in one of two
 * shapes, neither of which serves the file directly.
 */
function normaliseDriveUrl(url) {
  const id =
    url.match(/drive\.google\.com\/open\?id=([\w-]+)/)?.[1] ??
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ??
    url.match(/drive\.google\.com\/uc\?[^"]*id=([\w-]+)/)?.[1]
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : null
}

/**
 * Any Drive failure gets the same explanation, because the cause is almost
 * always the same one and the raw status says nothing useful. A private file
 * can 404, 403, or return a sign-in page with a 200 — three symptoms, one fix.
 */
function driveNote(isDrive, detail) {
  if (!isDrive) return detail
  return `${detail} — Drive file is not readable. Form uploads are private by default; set it to "Anyone with the link", or download it and attach it in the Studio`
}

/**
 * Fetches an image and uploads it to Sanity, refusing anything that looks
 * like a placeholder rather than a real asset.
 */
export async function uploadImage(rawUrl, { token, commit, label }) {
  if (!rawUrl) return { skipped: 'none supplied' }

  const driveUrl = normaliseDriveUrl(rawUrl)
  const url = driveUrl ?? rawUrl

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
    return { error: driveNote(driveUrl, `unreachable (${cause.message})`) }
  }
  if (!res.ok) return { error: driveNote(driveUrl, `HTTP ${res.status}`) }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    return { error: driveNote(driveUrl, `served ${contentType || 'no content-type'}, not an image`) }
  }

  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < MIN_IMAGE_BYTES) {
    return { error: `only ${(bytes.length / 1024).toFixed(1)}KB — a thumbnail, not the original` }
  }

  if (!commit) return { dryRun: true, bytes: bytes.length, contentType }

  const upload = await fetch(
    `${API}/assets/images/${DATASET}?filename=${encodeURIComponent(label)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body: bytes,
    },
  )
  const body = await upload.json()
  if (!upload.ok) return { error: `upload failed: ${JSON.stringify(body).slice(0, 200)}` }
  return { assetId: body.document._id, bytes: bytes.length }
}

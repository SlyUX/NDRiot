import { readFileSync } from 'node:fs'

/**
 * Text handling and taxonomy shared by the import scripts.
 *
 * The lists are READ from src/lib/taxonomy.ts rather than copied into this
 * file. They were copied, once, and drifted within the hour: adding One-Shot
 * to the real taxonomy left the importer rejecting it as unrecognised, on a
 * form that had just been told to offer it.
 *
 * These scripts are plain Node and cannot import a TypeScript module, so the
 * arrays are parsed out of the source. That is a little crude, and it fails
 * loudly if the shape of that file changes — which is the point. A parse
 * error is a five-minute fix; a silently stale list rejects real submissions
 * and looks like the submitter's mistake.
 */

const TAXONOMY_SOURCE = new URL('../../src/lib/taxonomy.ts', import.meta.url)

function readList(name) {
  const source = readFileSync(TAXONOMY_SOURCE, 'utf8')
  const block = source.match(new RegExp(`export const ${name} = \\[(.*?)\\] as const`, 's'))
  if (!block) {
    throw new Error(
      `Could not find "${name}" in src/lib/taxonomy.ts. If that file was restructured, update readList() in scripts/lib/shared.mjs.`,
    )
  }
  const values = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  if (values.length === 0) throw new Error(`"${name}" parsed as empty.`)
  return values
}

export const GENRES = readList('GENRES')
export const FORMATS = readList('FORMATS')
export const MATURITY = readList('MATURITY_RATINGS')
export const LINK_KINDS = readList('LINK_KINDS')

/** Not in taxonomy.ts — it lives on the book schema's status field. */
export const STATUSES = ['Ongoing', 'Complete', 'Upcoming']

/**
 * Repairs UTF-8 that was decoded as Latin-1 somewhere upstream.
 *
 * A clean export needs none of this — it is a no-op on good data. It exists
 * because a mangled em-dash in a bio ships visibly broken and is tedious to
 * spot by eye across a batch.
 */
export function repairText(value) {
  if (!value) return value
  let out = value

  if (/â€|Ã|Â/.test(out)) {
    const roundTripped = Buffer.from(out, 'latin1').toString('utf8')
    if (!roundTripped.includes('\uFFFD')) out = roundTripped
  }

  return out
    .replace(/â€"/g, '\u2014')
    .replace(/â€™/g, '\u2019')
    .replace(/â€œ/g, '\u201C')
    .replace(/â€/g, '\u201D')
    .replace(/â(?=\s)|(?<=\s)â/g, '\u2014')
}

export function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

/** Plain text to Portable Text, one block per non-empty line. */
export function toPortableText(text) {
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

/**
 * Parses an answer against a known list.
 *
 * `single` matters: a single-select option label can contain commas inside
 * its description — "Teen+ \u2014 16+, moderate violence, profanity" is one
 * choice, not four. Splitting it produces phantom "unrecognised" warnings on
 * every submission, which trains the reader to ignore the block that also
 * carries the real ones.
 */
export function matchTaxonomy(answer, allowed, { single = false } = {}) {
  const matched = []
  const unknown = []
  for (const raw of single ? [answer ?? ''] : (answer ?? '').split(',')) {
    // Form labels carry their description after an em-dash; take the label.
    const value = raw.split('\u2014')[0].trim()
    if (!value) continue
    const hit = allowed.find((a) => a.toLowerCase() === value.toLowerCase())
    if (hit) matched.push(hit)
    else unknown.push(value)
  }
  return { matched, unknown }
}

export const isYes = (value) => /^yes\b/i.test((value ?? '').trim())

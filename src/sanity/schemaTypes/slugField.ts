import { defineField } from 'sanity'

/**
 * Shared slug field. Not a registered schema type — a helper that returns a
 * configured field, so every document type gets identical slug rules.
 *
 * Two layers, because one isn't enough:
 *
 *  - `slugify` normalises what the Generate button produces.
 *  - `validation` catches what Generate never sees. Sanity documents that
 *    slugify is skipped when a slug is entered by hand, which is exactly how
 *    an uppercase slug reaches production. Next.js routes are case-sensitive,
 *    so `/creators/Fox-Storytelling` resolving while
 *    `/creators/fox-storytelling` 404s is a real, silent bug.
 */

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    // Decompose accents then drop the combining marks, so "Sanguiné" becomes
    // "sanguine" rather than "sanguin". Written as escapes, not literal
    // combining characters — those are invisible in source and easy to break.
    // Note this only helps letters that decompose; "Æ" has no NFD form and is
    // stripped by the filter below.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Anything that isn't a letter, number or space becomes a gap...
    .replace(/[^a-z0-9\s-]/g, ' ')
    // ...and runs of gaps collapse to a single hyphen.
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugField(source: string, routeExample: string) {
  return defineField({
    name: 'slug',
    title: 'URL slug',
    type: 'slug',
    description: `Appears in the address bar: ${routeExample}. Click Generate. Lowercase letters, numbers and hyphens only — URLs are case-sensitive, so a capital letter here breaks any link that omits it.`,
    options: { source, slugify },
    validation: (rule) =>
      rule.required().custom((value) => {
        const current = value?.current
        if (!current) return 'A slug is required.'
        if (!SLUG_PATTERN.test(current)) {
          return `"${current}" is not a valid slug. Use lowercase letters, numbers and single hyphens — e.g. "${slugify(current)}".`
        }
        return true
      }),
  })
}

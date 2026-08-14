import { defineType, defineField } from 'sanity'

/**
 * A comics convention — a place creators table, meet readers, and launch work.
 *
 * Modeled as an *evergreen venue*, not a dated occurrence: a convention recurs,
 * so we store where it is and roughly when ("Every July"), not one year's hard
 * dates that go stale. That also lets creator ratings (a later phase) accumulate
 * on the con itself across years, rather than fragmenting per occurrence.
 *
 * Directory at /conventions, detail at /conventions/[slug]. Listed in neutral
 * (alphabetical) order — never by rating (AGENTS.md §3): a convention is a venue
 * being reviewed, not a contributor, and reviews must not order discovery.
 *
 * Built to extend: comic shops are the same shape and will arrive as a sibling
 * type sharing the ratings machinery — see the ratings plan.
 */
export default defineType({
  name: 'convention',
  title: 'Convention',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'The convention’s name — e.g. "Short Run" or "SPX".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'The URL at /conventions/[slug]. Generate it from the name.',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'City and state/country — e.g. "Seattle, WA". "Touring" if it moves.',
    }),
    defineField({
      name: 'whenHint',
      title: 'When',
      type: 'string',
      description: 'Roughly when it happens each year — e.g. "Every July". Not a hard date; the con recurs.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description: 'The official site. Opens in a new tab.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'A short line on what it is and who it’s for. Shown on the card and the page.',
    }),
    defineField({
      name: 'image',
      title: 'Logo or banner',
      type: 'imageWithAlt',
      description: 'The convention’s logo or a banner. Optional; add real alt text.',
    }),
  ],
  orderings: [{ name: 'alpha', title: 'Name', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', subtitle: 'location', media: 'image' },
  },
})

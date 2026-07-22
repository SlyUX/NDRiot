import { defineType, defineField } from 'sanity'

import {
  FORMATS,
  FORMAT_DESCRIPTIONS,
  GENRES,
  MATURITY_DESCRIPTIONS,
  MATURITY_RATINGS,
} from '@/lib/taxonomy'
import { slugField } from './slugField'

/**
 * Formats where counting issues means nothing.
 *
 * A graphic novel is one volume and a one-shot is one issue, so the count is
 * always 1 and tells a reader nothing they did not already learn from the
 * format. A webcomic has no fixed instalments to count at all.
 *
 * The rest keep the field: for a single issue or a collected edition, "how
 * many are out" is the track-record signal, and it is the whole reason the
 * field exists.
 */
const SINGLE_VOLUME_FORMATS = ['Graphic Novel', 'One-Shot', 'Webcomic'] as const

export default defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The book or series title, as the creator styles it.',
      validation: (rule) => rule.required(),
    }),
    slugField('title', '/books/your-slug'),
    defineField({
      name: 'creator',
      title: 'Creator',
      type: 'reference',
      to: [{ type: 'creator' }],
      description: 'Who made it. They need a Creator profile first.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cover',
      title: 'Cover art',
      type: 'imageWithAlt',
      description: 'Portrait orientation reads best — cards crop to 2:3.',
    }),
    defineField({
      name: 'genres',
      title: 'Genres',
      type: 'array',
      of: [{ type: 'string', options: { list: [...GENRES] } }],
      options: { layout: 'grid' },
      description:
        'What the book is ABOUT. Pick up to three. Format (zine, graphic novel) and audience (Mature) are separate fields below — do not spend a genre slot on them. To add a genre, edit src/lib/taxonomy.ts.',
      validation: (rule) => rule.max(3).unique(),
    }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: FORMATS.map((value) => ({ title: `${value} — ${FORMAT_DESCRIPTIONS[value]}`, value })),
      },
      description: 'How it was made and published.',
    }),
    defineField({
      name: 'maturity',
      title: 'Audience',
      type: 'string',
      options: {
        list: MATURITY_RATINGS.map((value) => ({
          title: `${value} — ${MATURITY_DESCRIPTIONS[value]}`,
          value,
        })),
        layout: 'radio',
      },
      description:
        'Who it is for. Comics have no ratings board — creators self-rate, and these tiers match the DC/Image system most publishers use. Leave blank if genuinely unsure; a wrong rating is worse than none.',
    }),
    defineField({
      name: 'status',
      title: 'Publication status',
      type: 'string',
      options: { list: ['Ongoing', 'Complete', 'Upcoming'] },
      initialValue: 'Ongoing',
      description: 'Tells readers what they are getting into before they buy.',
    }),
    defineField({
      name: 'issueCount',
      title: 'Issues available',
      type: 'number',
      description:
        'How many are out right now, for a series. This is the honest signal a reader wants: "Ongoing, 7 issues" reassures where "Ongoing" alone does not, and "Ongoing, 1 issue" warns without anyone passing judgement. Only asked for serialised formats.',
      hidden: ({ document }) =>
        SINGLE_VOLUME_FORMATS.includes(document?.format as (typeof SINGLE_VOLUME_FORMATS)[number]),
      validation: (rule) =>
        rule
          .min(1)
          .integer()
          // `hidden` does not clear a value, it only stops showing it. Enter 7
          // issues, then change the format to Graphic Novel, and the 7 stays
          // on the document — invisible in the Studio but still rendered on
          // the book page as "Graphic Novel · 7 issues". This catches that.
          .custom((value, context) => {
            if (value === undefined || value === null) return true
            const format = context.document?.format as string | undefined
            if (format && SINGLE_VOLUME_FORMATS.includes(format as never)) {
              return `A ${format} is a single volume — clear this field, or change the format if it is serialised.`
            }
            return true
          }),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences for cards and search results. Plain text.',
      validation: (rule) =>
        rule.max(200).warning('Cards clamp to two lines — longer text will be cut off.'),
    }),
    defineField({
      name: 'description',
      title: 'Full description',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'The full pitch, shown on the book page.',
    }),
    defineField({
      name: 'links',
      title: 'Where to find it',
      type: 'array',
      of: [{ type: 'bookLink' }],
      description:
        'Every route to the work — free reads, shops, Patreon, a live campaign. Put the option that serves the creator best first; free reads and live campaigns are shown most prominently regardless.',
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'creator.name', media: 'cover' } },
})

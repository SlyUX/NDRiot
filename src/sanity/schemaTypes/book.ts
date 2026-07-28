import { defineType, defineField } from 'sanity'

import {
  FORMATS,
  FORMAT_DESCRIPTIONS,
  GENRES,
  MATURITY_DESCRIPTIONS,
  MATURITY_RATINGS,
  SINGLE_VOLUME_FORMATS,
  STATUSES,
  type BookFormat,
} from '@/lib/taxonomy'
import { slugField } from './slugField'

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
      options: { list: [...STATUSES] },
      initialValue: 'Ongoing',
      description: 'Tells readers what they are getting into before they buy.',
    }),
    defineField({
      name: 'issueCount',
      title: 'Issues available',
      type: 'number',
      description:
        'How many are out right now, for a series. This is the honest signal a reader wants: "Ongoing, 7 issues" reassures where "Ongoing" alone does not, and "Ongoing, 1 issue" warns without anyone passing judgement. Only asked for serialised formats.',
      hidden: ({ document }) => SINGLE_VOLUME_FORMATS.includes(document?.format as BookFormat),
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
            if (format && SINGLE_VOLUME_FORMATS.includes(format as BookFormat)) {
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
    defineField({
      name: 'previewUrl',
      title: 'Preview PDF',
      type: 'url',
      // Interim: we collect a LINK rather than a file, because form uploads land
      // in Drive where the import cannot fetch them (see scripts/lib/sanity.mjs).
      // A URL we can just point at sidesteps that. Revisit once intake moves off
      // Drive — a hosted file asset would then be the sturdier choice.
      description:
        'Optional. A direct, public link to a SHORT preview PDF — the first few pages, not the whole book. It must open the PDF straight away for anyone, with no sign-in: a Google Drive "share" link that shows a login or a preview page will not do. Shown as a "Read a preview" button on the book page.',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'creator.name', media: 'cover' } },
})

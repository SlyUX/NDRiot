import { defineType, defineField } from 'sanity'

import {
  FORMATS,
  FORMAT_DESCRIPTIONS,
  GENRES,
  MATURITY_DESCRIPTIONS,
  MATURITY_RATINGS,
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
      options: { list: ['Ongoing', 'Complete', 'Upcoming'] },
      initialValue: 'Ongoing',
      description: 'Tells readers what they are getting into before they buy.',
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
      name: 'buyLinks',
      title: 'Buy links',
      type: 'array',
      of: [{ type: 'buyLink' }],
      description: 'Where to buy it. Put the creator-direct option first.',
    }),
    defineField({
      name: 'kickstarterUrl',
      title: 'Kickstarter link',
      type: 'url',
      description: 'Only while a campaign is live — this renders as a prominent button.',
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'creator.name', media: 'cover' } },
})

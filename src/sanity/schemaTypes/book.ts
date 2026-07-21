import { defineType, defineField } from 'sanity'

import { GENRES } from '@/lib/genres'
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
        'Pick up to three. A fixed list rather than free text: each genre is a browsable page, and "Sci-Fi" typed alongside "Science Fiction" would split it into two. To add a genre, edit src/lib/genres.ts.',
      validation: (rule) => rule.max(3).unique(),
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

import { defineType, defineField } from 'sanity'

import { slugField } from './slugField'

export default defineType({
  name: 'column',
  title: 'Column',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The headline.',
      validation: (rule) => rule.required(),
    }),
    slugField('title', '/editorial/columns/your-slug'),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'creator' }],
      description: 'Who wrote it. They need a Creator profile first.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'The hook, for listings and link previews. Plain text.',
      validation: (rule) =>
        rule.max(200).warning('Cards clamp to two lines — longer text will be cut off.'),
    }),
    defineField({
      name: 'cover',
      title: 'Header image',
      type: 'imageWithAlt',
      description: 'The wide image at the top of the article. Landscape (16:9) reads best here.',
    }),
    defineField({
      name: 'thumbnail',
      title: 'Card thumbnail',
      type: 'imageWithAlt',
      description:
        'A squarer 4:3 image for cards and previews, where the 16:9 header image crops badly. Optional — the header image is used if this is blank.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'imageWithAlt' }],
      description: 'The column itself. Images can be dropped in between paragraphs.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published',
      type: 'datetime',
      description: 'Sorts the editorial listing, newest first. A future date does not hide it.',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [{ title: 'Newest', name: 'new', by: [{ field: 'publishedAt', direction: 'desc' }] }],
  preview: { select: { title: 'title', subtitle: 'author.name', media: 'cover' } },
})

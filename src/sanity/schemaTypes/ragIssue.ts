import { defineType, defineField } from 'sanity'

import { slugField } from './slugField'

/**
 * An issue of the ND Riot Rag — the magazine.
 *
 * The PDF is free and hosted here (readers read it online or download it);
 * other formats (EPUB, print) go out through `buyLinks`, the same links a book
 * carries, rather than being hosted. Each issue has its own page at
 * /magazine/[slug]; the newest is featured on /magazine with the rest archived.
 * Table of contents and credits are rich text (like a resource body).
 */
export default defineType({
  name: 'ragIssue',
  title: 'Rag issue',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The issue’s title — e.g. "The First Issue" or a themed name.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'issueNumber',
      title: 'Issue number',
      type: 'number',
      description: 'Orders the issues (newest = highest) and shows as "Issue N".',
      validation: (rule) => rule.required().integer().positive(),
    }),
    slugField('title', '/magazine/your-slug'),
    defineField({
      name: 'cover',
      title: 'Cover',
      type: 'imageWithAlt',
      description: 'The issue cover. Portrait reads best — cards crop to 2:3.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Blurb',
      type: 'text',
      rows: 2,
      description: 'A sentence or two on what’s in this issue.',
      validation: (rule) =>
        rule.max(300).warning('Keep it short — this sits under the title.'),
    }),
    defineField({
      name: 'pdfFile',
      title: 'PDF',
      type: 'file',
      options: { accept: '.pdf,application/pdf' },
      description: 'The free, on-site edition. Readers read it online or download it.',
    }),
    defineField({
      name: 'buyLinks',
      title: 'Other editions (EPUB, print, …)',
      type: 'array',
      of: [{ type: 'bookLink' }],
      description:
        'Where to get formats we don’t host — EPUB, print, etc. Same links a comic uses; label each clearly (e.g. "EPUB on Amazon").',
    }),
    defineField({
      name: 'toc',
      title: 'Table of contents',
      type: 'array',
      of: [{ type: 'block' }, { type: 'imageWithAlt' }],
      description: 'What’s inside. Format it as a list; add links to contributors if you like.',
    }),
    defineField({
      name: 'credits',
      title: 'Credits',
      type: 'array',
      of: [{ type: 'block' }, { type: 'imageWithAlt' }],
      description: 'Who made this issue — writers, artists, editors, thanks.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published',
      type: 'datetime',
      description: 'The issue date, shown on the page.',
    }),
  ],
  preview: {
    select: { title: 'title', issueNumber: 'issueNumber', media: 'cover' },
    prepare: ({ title, issueNumber, media }) => ({
      title: issueNumber ? `Issue ${issueNumber}: ${title}` : title,
      media,
    }),
  },
})

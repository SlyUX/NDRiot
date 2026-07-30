import { defineType, defineField } from 'sanity'

import { GENRES, FORMATS } from '@/lib/taxonomy'

/**
 * Editorial copy for a genre or format landing page (/categories/[genre],
 * /formats/[format]).
 *
 * The pages exist and list their comics whether or not a hub doc is written —
 * this just gives an editor a place to add a real, unique intro and SEO copy so
 * the page reads like a curated doorway rather than a bare filter result. A
 * missing doc falls back to generated copy.
 *
 * It holds words, not the listing: the comics shown are always the live,
 * neutral, alphabetical set for that genre/format (AGENTS.md §3 — no ranking).
 */
export default defineType({
  name: 'hubPage',
  title: 'Genre / Format hub',
  type: 'document',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          { title: 'Genre', value: 'genre' },
          { title: 'Format', value: 'format' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'value',
      title: 'Genre or format',
      type: 'string',
      description:
        'The exact genre or format this page is for — must match the taxonomy. Genres and formats are both listed; pick the one matching the Kind above.',
      options: { list: [...GENRES, ...FORMATS] },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Paragraph', value: 'normal' }],
          lists: [],
          marks: { decorators: [{ title: 'Bold', value: 'strong' }], annotations: [] },
        },
      ],
      description:
        'A short, unique intro for this hub — what the genre/format is and why the independent take on it is worth a reader’s time. A sentence or two; this is the page’s voice and its SEO/GEO content.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      description:
        'The browser-tab / search title. Include the phrase people actually search — e.g. “Independent Graphic Novels” or “Indie Horror Comics”. Falls back to a generated title if blank.',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 2,
      description: 'The search-result snippet. One or two sentences. Falls back to the intro if blank.',
    }),
  ],
  preview: {
    select: { value: 'value', kind: 'kind' },
    prepare: ({ value, kind }) => ({ title: value ?? '(unset)', subtitle: kind }),
  },
})

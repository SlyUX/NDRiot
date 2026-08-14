import { defineType, defineField } from 'sanity'

import { RESOURCE_CATEGORIES } from '@/lib/taxonomy'
import { slugField } from './slugField'

/**
 * A resource — a piece of help for indie creators and readers, living on
 * /resources beside the free downloads. Every resource has its own page
 * (/resources/[slug]) with article-style body copy; the `kind` decides what
 * leads that page:
 *
 *  - video    — an embedded YouTube video, then the write-up
 *  - download — a file to grab (a template, a PDF), then the write-up
 *  - link     — a prominent link out (a tool, a shop, another collective)
 *  - guide    — no lead media; the body IS the piece (a list, a how-to)
 *
 * Neutral category, never ranked (AGENTS.md §3). Attribution is optional: a
 * `creator` reference when it's by an ND Riot contributor, or a free-text
 * `source` for anyone else.
 */
export const RESOURCE_KINDS = [
  { title: 'Video — embedded YouTube, then copy', value: 'video' },
  { title: 'Download — a file, then copy', value: 'download' },
  { title: 'Link — a prominent link out, then copy', value: 'link' },
  { title: 'Guide — written piece (a list, a how-to)', value: 'guide' },
] as const

/** Field is required only when the resource is of `kind`. */
function requiredForKind(kind: string, message: string) {
  return (value: unknown, context: { parent?: unknown }) => {
    const parentKind = (context.parent as { kind?: string })?.kind
    if (parentKind === kind && !value) return message
    return true
  }
}

export default defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The resource’s name — e.g. "How to letter a comic in Affinity" or "ComicFury".',
      validation: (rule) => rule.required(),
    }),
    slugField('title', '/resources/your-slug'),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'What leads the page. Every kind can still carry the write-up below it.',
      options: { list: [...RESOURCE_KINDS], layout: 'radio' },
      initialValue: 'guide',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'What kind of resource it is. Shown as a label; groups the list.',
      options: { list: [...RESOURCE_CATEGORIES] },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Card summary',
      type: 'text',
      rows: 2,
      description: 'A sentence or two for the listing card. Plain text (the full write-up is the Body).',
      validation: (rule) =>
        rule.max(240).warning('Cards clamp longer text — keep it to a couple of lines.'),
    }),
    // — Lead media, by kind. Each is shown only for its kind. —
    defineField({
      name: 'videoUrl',
      title: 'YouTube link',
      type: 'url',
      description: 'A youtube.com or youtu.be link. Embedded at the top of the page.',
      hidden: ({ parent }) => parent?.kind !== 'video',
      validation: (rule) =>
        rule
          .uri({ scheme: ['http', 'https'] })
          .custom(requiredForKind('video', 'Add the YouTube link for this video.')),
    }),
    defineField({
      name: 'file',
      title: 'Downloadable file',
      type: 'file',
      description: 'The file readers download — a PDF template, a brush pack, etc.',
      hidden: ({ parent }) => parent?.kind !== 'download',
      validation: (rule) =>
        rule.custom(requiredForKind('download', 'Attach the file for this download.')),
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description: 'Where the "Visit" button sends readers — the tool, shop, or site.',
      hidden: ({ parent }) => parent?.kind !== 'link',
      validation: (rule) =>
        rule
          .uri({ scheme: ['http', 'https'] })
          .custom(requiredForKind('link', 'Add the link this resource points to.')),
    }),
    // — Shared —
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'imageWithAlt' }],
      description:
        'The write-up, shown beneath the lead media. Format text, add links, and insert images inline. For a Guide this is the whole piece.',
    }),
    defineField({
      name: 'image',
      title: 'Cover image',
      type: 'imageWithAlt',
      description: 'Optional — a thumbnail for the card and a header on the page (except videos).',
    }),
    defineField({
      name: 'creator',
      title: 'By (ND Riot creator)',
      type: 'reference',
      to: [{ type: 'creator' }],
      description: 'Optional — credit a contributor. Links to their profile.',
    }),
    defineField({
      name: 'source',
      title: 'By (outside source)',
      type: 'string',
      description: 'Optional — credit someone who isn’t an ND Riot creator (a plain name).',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Added',
      type: 'datetime',
      description: 'When it was added. The list groups by category, then alphabetically.',
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'category', media: 'image' } },
})

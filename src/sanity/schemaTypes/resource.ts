import { defineType, defineField } from 'sanity'

/**
 * A resource — an off-site link worth pointing indie creators and readers at:
 * hosting, tools, communities, funding, learning. Unlike a free download it has
 * no file and no ND Riot page; it is purely an outbound link, so it carries a
 * URL rather than a slug. Grouped/labeled by a neutral category (never ranked —
 * AGENTS.md §3). Lives with Free Downloads on /resources.
 */
export const RESOURCE_CATEGORIES = [
  'Hosting & Publishing',
  'Tools & Software',
  'Community',
  'Funding',
  'Learning',
  'Print & Distribution',
] as const

export default defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The resource’s name — e.g. "ComicFury" or "The Comics Journal".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description: 'Where it lives. The card links straight out to this address.',
      validation: (rule) => rule.required().uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'What kind of resource it is. Shown as a label; used to group the list.',
      options: { list: [...RESOURCE_CATEGORIES] },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'A sentence or two on what it is and why it’s useful. Plain text.',
      validation: (rule) =>
        rule.max(240).warning('Cards clamp longer text — keep it to a couple of lines.'),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Added',
      type: 'datetime',
      description: 'When it was added. The list groups by category, then alphabetically.',
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'category' } },
})

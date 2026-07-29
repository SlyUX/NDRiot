import { defineType, defineField } from 'sanity'

/**
 * Where to find a media outlet — a labelled link to its show, channel, or site.
 * Simpler than `bookLink` (no kinds/campaigns): a media outlet's links are just
 * "here's where to listen / watch / read".
 */
export default defineType({
  name: 'mediaLink',
  title: 'Media link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'What the reader sees — "Listen on Spotify", "Watch on YouTube", "Website". Blank uses the domain.',
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { label: 'label', url: 'url' },
    prepare: ({ label, url }) => ({ title: label || url, subtitle: url }),
  },
})

import { defineType, defineField } from 'sanity'

import { LINK_KINDS, LINK_KIND_DESCRIPTIONS } from '@/lib/taxonomy'

/**
 * Where a reader can get to the work.
 *
 * Replaces `buyLink`. ND Riot exposes and redirects rather than selling, so
 * "buy" was the wrong frame: it had nowhere to put a free read or a Patreon,
 * and forced a separate special-cased field for Kickstarter.
 */
export default defineType({
  name: 'bookLink',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: LINK_KINDS.map((value) => ({
          title: `${value} — ${LINK_KIND_DESCRIPTIONS[value]}`,
          value,
        })),
      },
      description: 'Decides how prominently it is shown. Free reads and live campaigns lead.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description:
        'What the reader sees — "Amazon", "My store", "Free PDF", "Read on Webtoon". Leave blank and the site uses the domain.',
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { label: 'label', kind: 'kind', url: 'url' },
    prepare: ({ label, kind, url }) => ({ title: label || url, subtitle: kind }),
  },
})

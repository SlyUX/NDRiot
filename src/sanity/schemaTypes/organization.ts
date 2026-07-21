import { defineType, defineField } from 'sanity'

import { slugField } from './slugField'

/**
 * A group creators belong to — a collective, guild, or association.
 *
 * A document type rather than a text tag because organizations are shared by
 * definition: several creators reference the same one. Free text would let
 * "Nash.Illustrators" drift into "Nash Illustrators" across records, and the
 * only fix would be editing every creator by hand.
 *
 * Contrast with `creator.studioName`, which is a plain string — a studio
 * belongs to one creator, so there is nothing for it to drift against.
 */
export default defineType({
  name: 'organization',
  title: 'Organization',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Exactly as the organization writes it, punctuation included.',
      validation: (rule) => rule.required(),
    }),
    slugField('name', '/organizations/their-slug'),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description: 'Where to find them. Shown as a link on creator profiles.',
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'website' } },
})

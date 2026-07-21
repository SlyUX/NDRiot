import { defineType, defineField } from 'sanity'

import { slugField } from './slugField'

/**
 * A group creators belong to — a studio, collective, guild, or association.
 *
 * A document type rather than a text tag because organizations are shared by
 * definition: several creators reference the same one. Free text would let
 * "Nash.Illustrators" drift into "Nash Illustrators" across records, and the
 * only fix would be editing every creator by hand.
 *
 * Studios use this type too. A studio and a collective are structurally the
 * same thing — a named group, with a website, that creators belong to — so
 * they share one type rather than duplicating the shape. The difference is
 * cardinality and rendering, both of which live on `creator`: `studio` is a
 * single reference shown under the name, `organizations` is an array of up to
 * three shown under "Member of".
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
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'imageWithAlt',
      description:
        'Optional — the name is shown as text when there is none, which is a perfectly good result. Upload a version that works on a near-black background: a dark logo on transparency will disappear. PNG or SVG with transparency reads best.',
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'website' } },
})

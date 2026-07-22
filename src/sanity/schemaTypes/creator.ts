import { defineType, defineField } from 'sanity'

import { FORMATS, FORMAT_DESCRIPTIONS, GENRES, MATURITY_DESCRIPTIONS, MATURITY_RATINGS } from '@/lib/taxonomy'
import { slugField } from './slugField'

export default defineType({
  name: 'creator',
  title: 'Creator',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'How they want to be credited — a pen name is fine.',
      validation: (rule) => rule.required(),
    }),
    slugField('name', '/creators/their-slug'),
    defineField({
      name: 'studio',
      title: 'Studio',
      type: 'reference',
      to: [{ type: 'organization' }],
      description:
        'The studio they work under, if any — e.g. "Fox Storytelling". One per creator. A reference rather than free text so a studio can have several members and its own page. Create the Organization first if it is not in the list.',
    }),
    defineField({
      name: 'organizations',
      title: 'Organizations',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'organization' }] }],
      description:
        'Collectives or guilds they belong to, beyond their own studio. Up to three. Create the Organization first if it is not in the list.',
      validation: (rule) =>
        rule
          .max(3)
          .unique()
          .custom((organizations, context) => {
            const studioRef = (context.document?.studio as { _ref?: string } | undefined)?._ref
            if (!studioRef || !Array.isArray(organizations)) return true

            const duplicate = organizations.some(
              (organization) => (organization as { _ref?: string })?._ref === studioRef,
            )

            // Studio and organizations render in separate places on the
            // profile, so listing one in both prints it twice.
            return duplicate
              ? 'That organization is already set as this creator’s Studio above. Remove it here, or clear the Studio field.'
              : true
          }),
    }),
    defineField({
      name: 'genres',
      title: 'Genres they work in',
      type: 'array',
      of: [{ type: 'string', options: { list: [...GENRES] } }],
      options: { layout: 'grid' },
      description:
        'Up to three, describing their body of work rather than any single book. Books carry their own genres; these make the creator findable.',
      validation: (rule) => rule.max(3).unique(),
    }),
    defineField({
      name: 'formats',
      title: 'What they make',
      type: 'array',
      of: [{ type: 'string', options: { list: [...FORMATS] } }],
      options: { layout: 'grid' },
      description: Object.entries(FORMAT_DESCRIPTIONS)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' '),
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'audience',
      title: 'Who their work is for',
      type: 'string',
      options: {
        list: MATURITY_RATINGS.map((value) => ({
          title: `${value} — ${MATURITY_DESCRIPTIONS[value]}`,
          value,
        })),
        layout: 'radio',
      },
      description:
        'A summary of their work overall. Individual books can differ — this is the general signal, not a rule.',
    }),
    defineField({
      name: 'openToCollaboration',
      title: 'Open to collaboration',
      type: 'boolean',
      description:
        'Shows a badge on their profile saying they are looking for collaborators. Leave off unless they have said yes — this is a claim about them, not a default.',
      initialValue: false,
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'imageWithAlt',
      description: 'Shown as a square. A headshot, avatar, or self-portrait all work.',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Their story, in their voice. Shown on the creator page.',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'City and country, or however specific they want to be.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description: 'Their main site or storefront.',
    }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [{ type: 'socialLink' }],
      description: 'Only the accounts they actually use.',
    }),
    defineField({
      name: 'favoriteCreators',
      title: 'Favorite independent creators',
      type: 'array',
      of: [{ type: 'favoriteCreator' }],
      description:
        'Who they want to shout out. This is how the directory grows — link to an ND Riot profile where one already exists.',
    }),
  ],
  preview: {
    select: { title: 'name', studioName: 'studio.name', location: 'location', media: 'photo' },
    // Studio is the more useful disambiguator when two creators share a
    // location; fall back to location when there is no studio.
    prepare: ({ title, studioName, location, media }) => ({
      title,
      subtitle: studioName || location,
      media,
    }),
  },
})

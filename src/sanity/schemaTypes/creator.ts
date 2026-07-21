import { defineType, defineField } from 'sanity'

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
      name: 'studioName',
      title: 'Studio name',
      type: 'string',
      description:
        'Their studio or trading name, if they work under one — e.g. "Fox Storytelling". One per creator. Leave blank if they publish under their own name.',
    }),
    defineField({
      name: 'organizations',
      title: 'Organizations',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'organization' }] }],
      description:
        'Collectives or guilds they belong to. Up to three. Pick from the list — create the Organization first if it is not there yet.',
      validation: (rule) => rule.max(3).unique(),
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
    select: { title: 'name', studioName: 'studioName', location: 'location', media: 'photo' },
    // Studio name is the more useful disambiguator when two creators share a
    // location; fall back to location when there is no studio.
    prepare: ({ title, studioName, location, media }) => ({
      title,
      subtitle: studioName || location,
      media,
    }),
  },
})

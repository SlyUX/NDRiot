import { defineType, defineField } from 'sanity'

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
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      description: 'Appears in the address bar: /creators/their-slug. Click Generate.',
      options: { source: 'name' },
      validation: (rule) => rule.required(),
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
  preview: { select: { title: 'name', subtitle: 'location', media: 'photo' } },
})

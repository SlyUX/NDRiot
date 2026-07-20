import { defineType, defineField } from 'sanity'
// Mixed: link to an on-site creator, OR name + url for an off-site creator.
export default defineType({
  name: 'favoriteCreator', title: 'Favorite creator', type: 'object',
  fields: [
    defineField({ name: 'onSite', title: 'On-site creator', type: 'reference', to: [{ type: 'creator' }],
      description: 'Pick if they have an ND Riot profile.' }),
    defineField({ name: 'name', title: 'Name (off-site)', type: 'string' }),
    defineField({ name: 'url', title: 'URL (off-site)', type: 'url' }),
  ],
  preview: {
    select: { ref: 'onSite.name', name: 'name' },
    prepare: ({ ref, name }) => ({ title: ref || name || 'Favorite creator' }),
  },
})

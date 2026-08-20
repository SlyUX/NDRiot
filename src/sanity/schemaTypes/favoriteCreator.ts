import { defineType, defineField } from 'sanity'
// A cosign of an on-site ND Riot creator. Off-site (name + URL) cosigns were
// removed for now — re-add those two fields to bring them back.
export default defineType({
  name: 'favoriteCreator', title: 'Cosign', type: 'object',
  fields: [
    defineField({ name: 'onSite', title: 'Creator', type: 'reference', to: [{ type: 'creator' }],
      description: 'The ND Riot creator being cosigned.' }),
  ],
  preview: {
    select: { ref: 'onSite.name' },
    prepare: ({ ref }) => ({ title: ref || 'Cosign' }),
  },
})

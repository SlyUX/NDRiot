import { defineType, defineField } from 'sanity'
export default defineType({
  name: 'socialLink', title: 'Social link', type: 'object',
  fields: [
    defineField({ name: 'platform', title: 'Platform', type: 'string',
      options: { list: ['Instagram', 'X', 'Bluesky', 'TikTok', 'YouTube', 'Website', 'Other'] },
      validation: (r) => r.required() }),
    defineField({ name: 'url', title: 'URL', type: 'url', validation: (r) => r.required() }),
  ],
  preview: { select: { title: 'platform', subtitle: 'url' } },
})

import { defineType, defineField } from 'sanity'
export default defineType({
  name: 'buyLink', title: 'Buy link', type: 'object',
  fields: [
    defineField({ name: 'store', title: 'Store', type: 'string',
      options: { list: ['Own store', 'Bookshop.org', 'Amazon', 'Gumroad', 'Etsy', 'Kickstarter', 'Other'] },
      validation: (r) => r.required() }),
    defineField({ name: 'url', title: 'URL', type: 'url', validation: (r) => r.required() }),
  ],
  preview: { select: { title: 'store', subtitle: 'url' } },
})

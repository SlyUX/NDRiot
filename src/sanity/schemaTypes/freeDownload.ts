import { defineType, defineField } from 'sanity'
export default defineType({
  name: 'freeDownload', title: 'Free download', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'creator', type: 'reference', to: [{ type: 'creator' }], validation: (r) => r.required() }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'cover', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'file', title: 'Downloadable file', type: 'file' }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
  ],
  preview: { select: { title: 'title', subtitle: 'creator.name', media: 'cover' } },
})

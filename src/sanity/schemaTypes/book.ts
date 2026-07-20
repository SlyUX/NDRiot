import { defineType, defineField } from 'sanity'
export default defineType({
  name: 'book', title: 'Book', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'creator', type: 'reference', to: [{ type: 'creator' }], validation: (r) => r.required() }),
    defineField({ name: 'cover', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'genres', title: 'Genre tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } }),
    defineField({ name: 'status', type: 'string', options: { list: ['Ongoing', 'Complete', 'Upcoming'] }, initialValue: 'Ongoing' }),
    defineField({ name: 'shortDescription', type: 'text', rows: 3 }),
    defineField({ name: 'description', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'buyLinks', title: 'Buy links', type: 'array', of: [{ type: 'buyLink' }] }),
    defineField({ name: 'kickstarterUrl', title: 'Kickstarter link', type: 'url' }),
  ],
  preview: { select: { title: 'title', subtitle: 'creator.name', media: 'cover' } },
})

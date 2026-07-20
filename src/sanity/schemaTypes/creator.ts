import { defineType, defineField } from 'sanity'
export default defineType({
  name: 'creator', title: 'Creator', type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'photo', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'bio', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'location', type: 'string' }),
    defineField({ name: 'website', type: 'url' }),
    defineField({ name: 'socials', title: 'Social links', type: 'array', of: [{ type: 'socialLink' }] }),
    defineField({ name: 'favoriteCreators', title: 'Favorite independent creators', type: 'array', of: [{ type: 'favoriteCreator' }] }),
  ],
  preview: { select: { title: 'name', subtitle: 'location', media: 'photo' } },
})

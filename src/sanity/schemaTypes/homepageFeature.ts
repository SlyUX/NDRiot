import { defineType, defineField } from 'sanity'
export default defineType({
  name: 'homepageFeature', title: 'Homepage feature', type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Internal label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'active', type: 'boolean', initialValue: true }),
    defineField({ name: 'order', type: 'number' }),
    defineField({ name: 'items', title: 'Featured items (1-3)', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'book' }, { type: 'creator' }, { type: 'column' }, { type: 'interview' }] }],
      validation: (r) => r.max(3) }),
  ],
  preview: { select: { title: 'title', active: 'active' },
    prepare: ({ title, active }) => ({ title, subtitle: active ? 'Active' : 'Inactive' }) },
})

import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'homepageFeature',
  title: 'Homepage feature',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      description: 'Only ever seen here in the Studio — name it so you can find it again.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
      description:
        'Only ONE feature set shows at a time — the active one with the lowest order number. Turn others off rather than deleting them.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower wins when more than one set is active. Leave blank if you only have one.',
    }),
    defineField({
      name: 'items',
      title: 'Featured items (1-3)',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'book' }, { type: 'creator' }, { type: 'column' }, { type: 'interview' }],
        },
      ],
      description:
        'What to spotlight at the top of the homepage. Three fills the row; fewer is fine.',
      validation: (rule) => rule.max(3),
    }),
  ],
  preview: {
    select: { title: 'title', active: 'active' },
    prepare: ({ title, active }) => ({ title, subtitle: active ? 'Active' : 'Inactive' }),
  },
})

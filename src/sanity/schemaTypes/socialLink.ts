import { defineType, defineField } from 'sanity'

import { SOCIAL_PLATFORMS } from '@/lib/taxonomy'

export default defineType({
  name: 'socialLink', title: 'Social link', type: 'object',
  fields: [
    defineField({ name: 'platform', title: 'Platform', type: 'string',
      // Single source of truth shared with the intake form's platform dropdown.
      options: { list: [...SOCIAL_PLATFORMS] },
      validation: (r) => r.required() }),
    defineField({ name: 'url', title: 'URL', type: 'url', validation: (r) => r.required() }),
  ],
  preview: { select: { title: 'platform', subtitle: 'url' } },
})

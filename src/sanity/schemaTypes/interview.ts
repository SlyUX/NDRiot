import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'interview',
  title: 'Interview',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The headline.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      description: 'Appears in the address bar: /editorial/interviews/your-slug. Click Generate.',
      options: { source: 'title' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'interviewer',
      title: 'Interviewer',
      type: 'reference',
      to: [{ type: 'creator' }],
      description: 'Who asked the questions.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subject',
      title: 'Subject (interviewee)',
      type: 'reference',
      to: [{ type: 'creator' }],
      description: 'Who answered them. This is the name shown on cards.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'The hook, for listings and link previews. A good pull quote works well here.',
      validation: (rule) =>
        rule.max(200).warning('Cards clamp to two lines — longer text will be cut off.'),
    }),
    defineField({
      name: 'cover',
      title: 'Header image',
      type: 'imageWithAlt',
      description: 'Landscape reads best — editorial cards crop to 16:9.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'imageWithAlt' }],
      description: 'The interview itself. Images can be dropped in between questions.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published',
      type: 'datetime',
      description: 'Sorts the editorial listing, newest first. A future date does not hide it.',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [{ title: 'Newest', name: 'new', by: [{ field: 'publishedAt', direction: 'desc' }] }],
  preview: { select: { title: 'title', subtitle: 'subject.name', media: 'cover' } },
})

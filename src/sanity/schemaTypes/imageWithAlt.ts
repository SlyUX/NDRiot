import { defineType, defineField } from 'sanity'

/**
 * Every image on the site uses this instead of the bare `image` type, so alt
 * text is always available to the front end (AGENTS.md §2).
 *
 * `alt` is intentionally NOT required: making it so would block editors from
 * saving a draft, and a hard validation error is a worse outcome than a
 * decorative image. The warning nudges without blocking, and components fall
 * back to `alt=""` (correct for cover art whose title sits right beside it).
 */
export default defineType({
  name: 'imageWithAlt',
  title: 'Image',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description:
        'Describe the image for screen readers and for when it fails to load. Leave blank only if the image is decorative — e.g. a cover shown directly beside its own title.',
      validation: (rule) =>
        rule.max(160).warning('Long alt text is hard to listen to. Aim for one sentence.'),
    }),
  ],
})

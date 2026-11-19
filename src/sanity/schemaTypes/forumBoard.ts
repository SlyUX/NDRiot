import { defineType, defineField } from 'sanity'

/**
 * A forum board — a top-level category threads are filed under (Collab, The
 * Drawing Board, Conventions, …).
 *
 * PRIVACY: lives in the private `ndriot_auth` dataset with the rest of the forum
 * — the whole forum is roster-gated, so even the board list is not public.
 *
 * ORDERING (§3): boards render in a fixed editorial `order`, never by activity.
 * `adminOnlyPosts` marks a board where only admins may open threads
 * (Announcements). Seeded by scripts/seed-forum-categories.ts; editable here.
 */
export default defineType({
  name: 'forumBoard',
  title: 'Forum board',
  type: 'document',
  liveEdit: true,
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description: 'The board name readers see, e.g. “The Drawing Board”.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL key',
      type: 'slug',
      description: 'The /forum/<key> path segment. Generated from the name.',
      options: { source: 'title', maxLength: 64 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'One line under the board name. Say what belongs here.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Where the board sits in the list (ascending). Editorial, not by activity.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'adminOnlyPosts',
      title: 'Admin-only posting',
      type: 'boolean',
      description:
        'When on, only admins can start threads here (readers can still reply). Used for Announcements.',
      initialValue: false,
    }),
  ],
  orderings: [
    {
      name: 'orderAsc',
      title: 'Board order',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', order: 'order', adminOnly: 'adminOnlyPosts' },
    prepare: ({ title, order, adminOnly }) => ({
      title: title || 'Board',
      subtitle: [typeof order === 'number' ? `#${order}` : null, adminOnly ? 'admin-only' : null]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})

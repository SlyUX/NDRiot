import { defineType, defineField } from 'sanity'

/**
 * A forum thread — a titled discussion filed under one board. The opening post
 * is the first `forumPost` (isOpener), NOT stored here, so a thread and its
 * replies are uniform documents.
 *
 * PRIVACY: private `ndriot_auth` dataset (the whole forum is roster-gated).
 * Because an `ndriot_auth` doc can't reference a `production` doc, the author is
 * denormalized as id + name strings (same rule as messageThread). The board,
 * which lives in this dataset, IS a reference.
 *
 * ORDERING (§3): thread lists sort pinned-first then `lastPostAt` desc
 * (bump-on-reply) — a RECENCY signal, never a reply/reaction count. There is no
 * count field to rank by. `pinned` is admin housekeeping only.
 *
 * Written by the server action (src/app/actions/forum.ts). `status`, `pinned`,
 * and `reviewedAt` stay editable so a moderator can lock/remove/pin from Studio.
 */
export default defineType({
  name: 'forumThread',
  title: 'Forum thread',
  type: 'document',
  liveEdit: true,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Board',
      type: 'reference',
      to: [{ type: 'forumBoard' }],
      description: 'The board this thread is filed under.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'authorId',
      title: 'Author (id)',
      type: 'string',
      readOnly: true,
      description: 'The creator who started the thread (production creator id).',
    }),
    defineField({
      name: 'authorName',
      title: 'Author',
      type: 'string',
      readOnly: true,
      description: 'The author’s name, denormalized for legibility here.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description:
        'Lifecycle. “Locked” = no new replies; “Removed” = hidden from readers. Set by the app or a moderator.',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Locked (no new replies)', value: 'locked' },
          { title: 'Removed (hidden)', value: 'removed' },
        ],
        layout: 'radio',
      },
      initialValue: 'open',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pinned',
      title: 'Pinned',
      type: 'boolean',
      description: 'Float to the top of its board. Admin housekeeping (rules, announcements) only.',
      initialValue: false,
    }),
    defineField({
      name: 'createdAt',
      title: 'Created',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'lastPostAt',
      title: 'Last post',
      type: 'datetime',
      readOnly: true,
      description: 'Advances on every reply — the thread-list sort key.',
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed',
      type: 'datetime',
      readOnly: true,
      description: 'When a moderator last reviewed this thread.',
    }),
  ],
  orderings: [
    {
      name: 'activityDesc',
      title: 'Most recent activity',
      by: [
        { field: 'pinned', direction: 'desc' },
        { field: 'lastPostAt', direction: 'desc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      authorName: 'authorName',
      status: 'status',
      lastPostAt: 'lastPostAt',
    },
    prepare: ({ title, authorName, status, lastPostAt }) => ({
      title: title || 'Thread',
      subtitle: [
        authorName || null,
        status && status !== 'open' ? status.toUpperCase() : null,
        lastPostAt ? new Date(lastPostAt).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})

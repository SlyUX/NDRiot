import { defineType, defineField } from 'sanity'

/**
 * A report raised on a forum post — the moderation record behind the "Report"
 * action in a thread. Mirrors messageReport.
 *
 * PRIVACY: private `ndriot_auth` dataset. Snapshots the reported text at report
 * time (`reportedText`) so a reviewer sees exactly what was flagged without
 * chasing the live post, and so the record survives even if the author later
 * edits or deletes it. Reviewed in the "Operations" Studio workspace, grouped by
 * status like Rag submissions and message reports.
 *
 * Resolving a report notifies the reporter of the outcome. Written by the server
 * action (src/app/actions/forum.ts); reporter fields are read-only, `status` and
 * `reviewNote` are the reviewer's.
 */
export default defineType({
  name: 'forumReport',
  title: 'Forum report',
  type: 'document',
  liveEdit: true,
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Review state. "Actioned" = you intervened; "Dismissed" = no action needed.',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Actioned', value: 'actioned' },
          { title: 'Dismissed', value: 'dismissed' },
        ],
        layout: 'radio',
      },
      initialValue: 'open',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'reason',
      title: 'Reason',
      type: 'string',
      readOnly: true,
      description: 'Why the reporter flagged it (chosen from a fixed list).',
      options: {
        list: [
          { title: 'Harassment', value: 'harassment' },
          { title: 'Spam', value: 'spam' },
          { title: 'Inappropriate content', value: 'inappropriate' },
          { title: 'Other', value: 'other' },
        ],
      },
    }),
    defineField({
      name: 'reportedText',
      title: 'Reported text',
      type: 'text',
      rows: 4,
      readOnly: true,
      description: 'A snapshot of the flagged post at the time it was reported.',
    }),
    defineField({
      name: 'reporterNote',
      title: 'Reporter’s note',
      type: 'text',
      rows: 2,
      readOnly: true,
      description: 'An optional line the reporter added for context.',
    }),
    defineField({
      name: 'reporterId',
      title: 'Reporter (id)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'reporterName',
      title: 'Reporter',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'threadId',
      title: 'Thread id',
      type: 'string',
      readOnly: true,
      description: 'The forumThread document the reported post belongs to.',
    }),
    defineField({
      name: 'postId',
      title: 'Post id',
      type: 'string',
      readOnly: true,
      description: 'The reported forumPost document.',
    }),
    defineField({
      name: 'reviewNote',
      title: 'Review note',
      type: 'text',
      rows: 2,
      description: 'Your private note on how this was handled.',
    }),
    defineField({
      name: 'createdAt',
      title: 'Reported',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      name: 'createdDesc',
      title: 'Newest first',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      reason: 'reason',
      reporterName: 'reporterName',
      status: 'status',
      createdAt: 'createdAt',
    },
    prepare: ({ reason, reporterName, status, createdAt }) => ({
      title: [reason ? reason.toUpperCase() : 'REPORT', reporterName].filter(Boolean).join(' · '),
      subtitle: [
        status ? status.toUpperCase() : null,
        createdAt ? new Date(createdAt).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})

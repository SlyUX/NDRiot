import { defineType, defineField } from 'sanity'

/**
 * A report raised on a message or thread — the moderation record behind the
 * "Report" action in a conversation.
 *
 * PRIVACY: lives ONLY in the private `ndriot_auth` dataset. It snapshots the
 * reported text at report time (`reportedText`) so a reviewer sees exactly what
 * was flagged without chasing the live thread, and so the record survives if the
 * message is later removed. Reviewed in the "Operations" Studio workspace —
 * grouped by status, the same way Rag submissions are triaged.
 *
 * Resolving a report should notify the reporter of the outcome; the reported
 * party hears only of an action taken (not that a review occurred), so a report
 * neither tips off the reported party nor exposes the reporter. See
 * docs/legal-brief.md §8.
 *
 * Written by the server action (src/app/actions/messages.ts). Reporter fields are
 * read-only; `status` and `reviewNote` are the reviewer's to set.
 */
export default defineType({
  name: 'messageReport',
  title: 'Message report',
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
      description: 'A snapshot of the flagged message at the time it was reported.',
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
      description: 'The messageThread document this was reported from.',
    }),
    defineField({
      name: 'messageKey',
      title: 'Message key',
      type: 'string',
      readOnly: true,
      description: 'The reported message’s array key, or empty for the whole thread.',
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

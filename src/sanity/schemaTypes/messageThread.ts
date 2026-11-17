import { defineType, defineField } from 'sanity'

/**
 * A 1:1 message thread between two creators — the persistent channel behind the
 * "Message" connect handshake (parallel to, not part of, the collab handshake).
 *
 * PRIVACY: lives ONLY in the private `ndriot_auth` dataset (never the
 * world-readable `production` dataset) — it carries free-text message bodies and
 * ties two creators together. Reviewed in the "Operations" Studio workspace.
 *
 * ACCESS DISCIPLINE: a moderator opens a thread only on a report or a genuine
 * safety concern — never idle browsing. Review is meant to run through a logged
 * Studio action that notifies participants per policy (admin-initiated review →
 * both are told; report-triggered → the reporter gets the outcome, the reported
 * party only any action taken). See docs/legal-brief.md §8.
 *
 * Shape notes:
 *  - One thread per creator PAIR, ever: the `_id` is deterministic from the two
 *    ids sorted, so either creator initiating resolves to the same document.
 *  - Messages are stored INLINE (`messages[]`) rather than as separate docs —
 *    one document, one fetch, which is right at beta scale. Splitting to
 *    per-message documents is a deliberate later refactor if volume demands it.
 *  - Because a `ndriot_auth` document can't reference a `production` document,
 *    creators are stored denormalized as id + name strings.
 *  - Written by the server action (src/app/actions/messages.ts). Mostly
 *    read-only here; `status` stays editable so a moderator can force-close or
 *    block a thread from Studio.
 */
export default defineType({
  name: 'messageThread',
  title: 'Message thread',
  type: 'document',
  // App-written record, not draft→publish content — edits save immediately.
  liveEdit: true,
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description:
        'Lifecycle. Set by the app; a moderator may force "Closed" or "Blocked" here.',
      options: {
        list: [
          { title: 'Pending (awaiting accept)', value: 'pending' },
          { title: 'Active', value: 'active' },
          { title: 'Declined', value: 'declined' },
          { title: 'Closed (opted out)', value: 'closed' },
          { title: 'Blocked', value: 'blocked' },
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'participantIds',
      title: 'Participant ids',
      type: 'array',
      of: [{ type: 'string' }],
      readOnly: true,
      description: 'The two creator document ids in this thread (production ids).',
    }),
    defineField({
      name: 'participantNames',
      title: 'Participants',
      type: 'array',
      of: [{ type: 'string' }],
      readOnly: true,
      description: 'The two creators’ names, denormalized for legibility here.',
    }),
    defineField({
      name: 'initiatedById',
      title: 'Initiated by (id)',
      type: 'string',
      readOnly: true,
      description: 'Which creator sent the original request.',
    }),
    defineField({
      name: 'closedById',
      title: 'Closed by (id)',
      type: 'string',
      readOnly: true,
      description: 'Which creator opted out, when status is Closed.',
    }),
    defineField({
      name: 'blockedById',
      title: 'Blocked by (id)',
      type: 'string',
      readOnly: true,
      description: 'Which creator blocked the other, when status is Blocked.',
    }),
    defineField({
      name: 'introNote',
      title: 'Intro note',
      type: 'text',
      rows: 3,
      readOnly: true,
      description: 'The requester’s opening message, shown with the request.',
    }),
    defineField({
      name: 'messages',
      title: 'Messages',
      type: 'array',
      readOnly: true,
      description: 'The conversation, oldest first.',
      of: [
        defineField({
          name: 'messageItem',
          title: 'Message',
          type: 'object',
          fields: [
            defineField({ name: 'fromId', title: 'From (id)', type: 'string' }),
            defineField({ name: 'fromName', title: 'From', type: 'string' }),
            defineField({ name: 'body', title: 'Body', type: 'text', rows: 2 }),
            defineField({ name: 'createdAt', title: 'Sent', type: 'datetime' }),
          ],
          preview: {
            select: { title: 'fromName', subtitle: 'body' },
          },
        }),
      ],
    }),
    defineField({
      name: 'createdAt',
      title: 'Created',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'respondedAt',
      title: 'Responded',
      type: 'datetime',
      readOnly: true,
      description: 'When the recipient accepted or declined.',
    }),
    defineField({
      name: 'lastMessageAt',
      title: 'Last message',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed',
      type: 'datetime',
      readOnly: true,
      description:
        'When a moderator last ran an admin-initiated review (both participants were notified).',
    }),
  ],
  orderings: [
    {
      name: 'lastMessageDesc',
      title: 'Most recent activity',
      by: [{ field: 'lastMessageAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      names: 'participantNames',
      status: 'status',
      lastMessageAt: 'lastMessageAt',
    },
    prepare: ({ names, status, lastMessageAt }) => ({
      title: Array.isArray(names) && names.length ? names.join(' ↔ ') : 'Thread',
      subtitle: [
        status ? status.toUpperCase() : null,
        lastMessageAt ? new Date(lastMessageAt).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})

import { defineType, defineField } from 'sanity'

/**
 * One issue of ND Noise — the monthly personalized newsletter.
 *
 * The document holds only what a human AUTHORS: the subject line and the
 * "Note from ND Riot" (an editor's note about recent improvements, framed
 * around how they help creators). Everything else in each subscriber's email —
 * the updates/conventions/new comics from the creators they follow, and the
 * shared Sunday Strips roundup — is composed at send time from live data
 * (src/lib/noise-digest.ts), never stored here.
 *
 * Lifecycle: a monthly cron creates a `draft` issue and emails the admin to
 * review it; the admin previews it, edits the Note, then triggers the send,
 * which flips `status` to `sent` and stamps `sentAt`. Nothing goes out without
 * that human step (a hard requirement — no blind/auto sends). `windowStart`
 * bounds "what's new": content published on or after it is included; the cron
 * sets it to the previous issue's `sentAt`.
 */
export default defineType({
  name: 'noiseIssue',
  title: 'ND Noise issue',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal title',
      type: 'string',
      description:
        'An internal label so you can find this issue in the Studio — e.g. "September 2026". Not shown to readers.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subject',
      title: 'Email subject line',
      type: 'string',
      description: 'The subject readers see in their inbox. Keep it short and specific.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'note',
      title: 'A note from ND Riot',
      type: 'array',
      description:
        'The editor’s note that leads every issue — a short word on what’s new on ND Riot, framed around how it helps creators (not a changelog). Basic formatting only: paragraphs, bold, italics, and links.',
      of: [
        {
          type: 'block',
          // Keep the note simple — it has to serialize to email-safe HTML.
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading', value: 'h3' },
          ],
          lists: [{ title: 'Bullet', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (rule) =>
                      rule.uri({ scheme: ['http', 'https', 'mailto'] }),
                  },
                ],
              },
            ],
          },
        },
      ],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description:
        'Draft issues can be previewed and edited; sending flips this to "Sent". Set automatically — you don’t normally edit it by hand.',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Sent', value: 'sent' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'windowStart',
      title: 'Include content since',
      type: 'datetime',
      description:
        'Updates, conventions, comics and strips published on or after this moment are included. Set automatically to the previous issue’s send time; adjust only if you need a different window.',
    }),
    defineField({
      name: 'sentAt',
      title: 'Sent at',
      type: 'datetime',
      description: 'Stamped automatically when the issue is sent. Leave blank.',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'newest',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', status: 'status', sentAt: 'sentAt' },
    prepare({ title, status, sentAt }) {
      const state = status === 'sent' ? `Sent ${sentAt ? new Date(sentAt).toLocaleDateString() : ''}` : 'Draft'
      return { title: title ?? 'ND Noise issue', subtitle: state }
    },
  },
})

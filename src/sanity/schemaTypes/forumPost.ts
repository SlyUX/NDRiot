import { defineType, defineField } from 'sanity'

/**
 * A forum post — the thread opener (isOpener) or a reply. Unlike 1:1 messages
 * (stored inline on the thread), forum posts are SEPARATE documents because
 * threads grow long.
 *
 * PRIVACY: private `ndriot_auth` dataset. Author denormalized as id + name
 * (can't reference a `production` creator); the thread, in this dataset, IS a
 * reference. Images are stored in this dataset so they can be reviewed here, the
 * same as message images.
 *
 * EDIT HISTORY: authors may edit or delete their own posts. An edit pushes the
 * current `{ body, image, savedAt }` into `revisions[]` (newest last) BEFORE
 * overwriting. A delete sets `status: 'deleted'` and keeps the content + history
 * on the doc for moderation — the reader UI renders a tombstone. Nothing is ever
 * destroyed, so a report always has something to point at.
 *
 * Written by the server action (src/app/actions/forum.ts). `status` stays
 * editable so a moderator can hide a post from Studio.
 */
export default defineType({
  name: 'forumPost',
  title: 'Forum post',
  type: 'document',
  liveEdit: true,
  fields: [
    defineField({
      name: 'thread',
      title: 'Thread',
      type: 'reference',
      to: [{ type: 'forumThread' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'authorId',
      title: 'Author (id)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'authorName',
      title: 'Author',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 4,
      readOnly: true,
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      readOnly: true,
      description:
        'An optional attached image, downsized to 1080×1350 on upload. Stored in this private dataset so it can be reviewed here like the text.',
    }),
    defineField({
      name: 'isOpener',
      title: 'Opening post',
      type: 'boolean',
      readOnly: true,
      description: 'True for the post that opened the thread.',
      initialValue: false,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: '“Deleted” = hidden from readers (content kept for the record). Set by the app or a moderator.',
      options: {
        list: [
          { title: 'Visible', value: 'visible' },
          { title: 'Deleted (hidden)', value: 'deleted' },
        ],
        layout: 'radio',
      },
      initialValue: 'visible',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'createdAt',
      title: 'Posted',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'editedAt',
      title: 'Edited',
      type: 'datetime',
      readOnly: true,
      description: 'When the author last edited this post.',
    }),
    defineField({
      name: 'revisions',
      title: 'Revision history',
      type: 'array',
      readOnly: true,
      description: 'Prior versions kept on edit or delete, oldest first.',
      of: [
        defineField({
          name: 'revision',
          title: 'Revision',
          type: 'object',
          fields: [
            defineField({ name: 'body', title: 'Body', type: 'text', rows: 3 }),
            defineField({ name: 'image', title: 'Image', type: 'image' }),
            defineField({ name: 'savedAt', title: 'Saved', type: 'datetime' }),
          ],
          preview: {
            select: { subtitle: 'body', media: 'image', savedAt: 'savedAt' },
            prepare: ({ subtitle, media, savedAt }) => ({
              title: savedAt ? new Date(savedAt).toLocaleString() : 'Revision',
              subtitle: subtitle || (media ? '📷 Image' : ''),
              media,
            }),
          },
        }),
      ],
    }),
  ],
  orderings: [
    {
      name: 'createdAsc',
      title: 'Oldest first',
      by: [{ field: 'createdAt', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      authorName: 'authorName',
      body: 'body',
      media: 'image',
      status: 'status',
      isOpener: 'isOpener',
    },
    prepare: ({ authorName, body, media, status, isOpener }) => ({
      title: [isOpener ? '◆' : null, authorName || 'Author'].filter(Boolean).join(' '),
      subtitle:
        status === 'deleted'
          ? '[deleted]'
          : body || (media ? '📷 Image' : ''),
      media,
    }),
  },
})

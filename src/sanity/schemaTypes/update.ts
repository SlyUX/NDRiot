import { defineType, defineField } from 'sanity'

import { UPDATE_KINDS, UPDATE_KIND_DESCRIPTIONS } from '@/lib/taxonomy'

/**
 * A creator update — a short note posted to a comic or a creator profile.
 *
 * Posted directly from /me (no review queue — updates are short, ephemeral, and
 * owner-curated; the post action is ownership-gated). Readers who *saved* the
 * target (Save = Follow) see it on their dashboard, newest-first. Never counted,
 * ranked, or trended (AGENTS.md §3) — a recency feed of what you chose to follow.
 * Lives in Studio too, so an update can be removed if it's ever misused.
 */
export default defineType({
  name: 'update',
  title: 'Creator update',
  type: 'document',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'What sort of update this is — sets the tag readers see.',
      initialValue: 'General news',
      options: {
        list: UPDATE_KINDS.map((value) => ({
          title: `${value} — ${UPDATE_KIND_DESCRIPTIONS[value]}`,
          value,
        })),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Update',
      type: 'text',
      rows: 3,
      description: 'A short note — a new page, a con, a milestone. Up to 200 characters.',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'target',
      title: 'About',
      type: 'reference',
      to: [{ type: 'creator' }, { type: 'book' }],
      description: 'The comic or creator this update is about — its followers see it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mentions',
      title: 'Mentions',
      type: 'array',
      description:
        'Other creators or conventions this update references — a collaborator, a con you’re tabling at. Shown as links under the note.',
      of: [{ type: 'reference', to: [{ type: 'creator' }, { type: 'convention' }] }],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Posted',
      type: 'datetime',
      description: 'When it was posted; orders the reader feed. Set automatically.',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    { name: 'posted', title: 'Newest', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { body: 'body', kind: 'kind', name: 'target.name', title: 'target.title' },
    prepare: ({ body, kind, name, title }) => ({
      title: body,
      subtitle: `${kind ?? 'Update'} · ${title || name || 'Unknown'}`,
    }),
  },
})

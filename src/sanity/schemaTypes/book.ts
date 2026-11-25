import { defineType, defineField } from 'sanity'

import {
  CREDIT_ROLES,
  FORMATS,
  FORMAT_DESCRIPTIONS,
  GENRES,
  MATURITY_TIERS,
  MATURITY_TIER_LABELS,
  MATURITY_TIER_DESCRIPTIONS,
  RATING_SOURCES,
  SINGLE_VOLUME_FORMATS,
  STATUSES,
  type BookFormat,
} from '@/lib/taxonomy'
import { slugField } from './slugField'

export default defineType({
  name: 'book',
  // Kept the internal type name `book` (routes, refs, ownership all key off it);
  // the reader-facing label is "Comic" across the site.
  title: 'Comic',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The book or series title, as the creator styles it.',
      validation: (rule) => rule.required(),
    }),
    slugField('title', '/comics/your-slug'),
    defineField({
      name: 'creator',
      title: 'Owner (primary creator)',
      type: 'reference',
      to: [{ type: 'creator' }],
      description:
        'Who owns this listing — the account that can edit it. They need a Creator profile first. Everyone ELSE who worked on the comic goes in “Credits” below.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'creatorRoles',
      title: 'Owner’s role(s)',
      type: 'array',
      of: [
        {
          type: 'string',
          options: { list: CREDIT_ROLES.map((value) => ({ title: value, value })) },
        },
      ],
      options: { layout: 'grid' },
      description:
        'What the owner did on this comic — tick all that apply (e.g. Writer and Artist). Optional; shown beside their name in the credits.',
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'credits',
      title: 'Credits (collaborators)',
      type: 'array',
      description:
        'Everyone else who worked on the comic — writer, artist, letterer, colorist, and so on. Each is either an ND Riot creator (linked to their profile) or a plain name for someone not on ND Riot yet. The owner above is not repeated here.',
      of: [
        {
          type: 'object',
          name: 'bookCredit',
          fields: [
            defineField({
              name: 'roles',
              title: 'Role(s)',
              type: 'array',
              of: [
                {
                  type: 'string',
                  options: {
                    list: CREDIT_ROLES.map((value) => ({ title: value, value })),
                  },
                },
              ],
              options: { layout: 'grid' },
              description: 'Tick everything this person did — e.g. Inker and Letterer.',
              validation: (rule) => rule.required().min(1).unique(),
            }),
            defineField({
              name: 'creator',
              title: 'ND Riot creator',
              type: 'reference',
              to: [{ type: 'creator' }],
              description:
                'If this collaborator has an ND Riot profile, link it — the credit links to their page, and (once confirmed) the comic appears on their profile. Leave blank and use “Name” for someone not on ND Riot.',
            }),
            defineField({
              name: 'name',
              title: 'Name',
              type: 'string',
              description:
                'For a collaborator with no ND Riot profile. Ignored when an ND Riot creator is linked above.',
            }),
            defineField({
              name: 'confirmed',
              title: 'Confirmed by the collaborator',
              type: 'boolean',
              initialValue: true,
              description:
                'A credit linking an ND Riot creator shows on THAT creator’s profile only when this is on. Admin-entered credits are trusted — leave on. The future owner-facing “add collaborator” flow will set this off until the collaborator confirms, so a credit can’t be put on someone’s profile without their say-so.',
            }),
          ],
          validation: (rule) =>
            rule.custom((credit) => {
              const value = credit as
                | { creator?: unknown; name?: string }
                | undefined
              if (!value) return true
              const hasCreator = Boolean(value.creator)
              const hasName = Boolean(value.name && value.name.trim())
              return hasCreator || hasName
                ? true
                : 'Link an ND Riot creator or enter a name.'
            }),
          preview: {
            select: {
              roles: 'roles',
              name: 'name',
              creatorName: 'creator.name',
            },
            prepare: ({ roles, name, creatorName }) => ({
              title: creatorName || name || 'Unnamed',
              subtitle: Array.isArray(roles) ? roles.join(', ') : undefined,
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'cover',
      title: 'Cover art',
      type: 'imageWithAlt',
      description: 'Portrait orientation reads best — cards crop to 2:3.',
    }),
    defineField({
      name: 'genres',
      title: 'Genres',
      type: 'array',
      of: [{ type: 'string', options: { list: [...GENRES] } }],
      options: { layout: 'grid' },
      description:
        'What the book is ABOUT. Pick up to three. Format (zine, graphic novel) and audience (Mature) are separate fields below — do not spend a genre slot on them. To add a genre, edit src/lib/taxonomy.ts.',
      validation: (rule) => rule.max(3).unique(),
    }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: FORMATS.map((value) => ({ title: `${value} — ${FORMAT_DESCRIPTIONS[value]}`, value })),
      },
      description: 'How it was made and published.',
    }),
    defineField({
      name: 'maturityRating',
      title: 'Maturity',
      type: 'string',
      options: {
        list: MATURITY_TIERS.map((value) => ({
          title: `${MATURITY_TIER_LABELS[value]} — ${MATURITY_TIER_DESCRIPTIONS[value]}`,
          value,
        })),
        layout: 'radio',
      },
      // Informational on a Comic: we don't host the book, so this rating does
      // NOT restrict it from being listed — the cover is gated separately by
      // "Cover is Mature" below. It only becomes an 18+ gate where we host
      // readable content: a Preview PDF, or an admin Free Download. Optional
      // (a comic can list without it); shown on the listing and on retail slips.
      description:
        'The comic’s content rating — shown on its listing and on retail shelf slips. Informational: it does not stop a comic from being listed (the cover is gated separately by “Cover is Mature”). It becomes an 18+ gate only where we host readable content — a Preview PDF or an admin Free Download. Mature = non-sexual nudity, graphic violence/gore, or adult themes — never sexual content, which is prohibited.',
    }),
    defineField({
      name: 'coverIsMature',
      title: 'Cover is Mature',
      type: 'boolean',
      initialValue: false,
      description:
        'Covers appear in public browse before anyone opts in, so they are held to the All-Ages bar. If the COVER itself is Mature, tick this — it gets blurred in listings while the listing stays visible.',
    }),
    defineField({
      name: 'ratingSource',
      title: 'Rating set by',
      type: 'string',
      options: { list: RATING_SOURCES.map((value) => ({ title: value, value })) },
      initialValue: 'creator',
      readOnly: true,
      description: 'Whether the creator set the rating or an operator corrected it. Set programmatically.',
    }),
    defineField({
      name: 'ratingNote',
      title: 'Rating note (operator)',
      type: 'string',
      description: 'If an operator changed the rating, the reason — shown to the creator.',
    }),
    defineField({
      name: 'status',
      title: 'Publication status',
      type: 'string',
      options: { list: [...STATUSES] },
      initialValue: 'Ongoing',
      description: 'Tells readers what they are getting into before they buy.',
    }),
    defineField({
      name: 'issueCount',
      title: 'Issues available',
      type: 'number',
      description:
        'How many are out right now, for a series. This is the honest signal a reader wants: "Ongoing, 7 issues" reassures where "Ongoing" alone does not, and "Ongoing, 1 issue" warns without anyone passing judgement. Only asked for serialised formats.',
      hidden: ({ document }) => SINGLE_VOLUME_FORMATS.includes(document?.format as BookFormat),
      validation: (rule) =>
        rule
          .min(1)
          .integer()
          // `hidden` does not clear a value, it only stops showing it. Enter 7
          // issues, then change the format to Graphic Novel, and the 7 stays
          // on the document — invisible in the Studio but still rendered on
          // the book page as "Graphic Novel · 7 issues". This catches that.
          .custom((value, context) => {
            if (value === undefined || value === null) return true
            const format = context.document?.format as string | undefined
            if (format && SINGLE_VOLUME_FORMATS.includes(format as BookFormat)) {
              return `A ${format} is a single volume — clear this field, or change the format if it is serialised.`
            }
            return true
          }),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences for cards and search results. Plain text.',
      validation: (rule) =>
        rule.max(200).warning('Cards clamp to two lines — longer text will be cut off.'),
    }),
    defineField({
      name: 'description',
      title: 'Full description',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'The full pitch, shown on the book page.',
    }),
    defineField({
      name: 'links',
      title: 'Where to find it',
      type: 'array',
      of: [{ type: 'bookLink' }],
      description:
        'Every route to the work — free reads, shops, Patreon, a live campaign. Put the option that serves the creator best first; free reads and live campaigns are shown most prominently regardless.',
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'bookVideo',
          fields: [
            defineField({
              name: 'title',
              title: 'Label',
              type: 'string',
              description: 'e.g. "Book trailer", "Interview", "Motion cover".',
              validation: (rule) => rule.required().max(60),
            }),
            defineField({
              name: 'url',
              title: 'YouTube URL',
              type: 'url',
              description: 'A YouTube or youtu.be link. Other hosts won’t embed.',
              validation: (rule) =>
                rule.required().uri({ scheme: ['http', 'https'] }),
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'url' } },
        },
      ],
      description:
        'Optional. Book trailers, interviews, readings — paste a YouTube link. Shown in a collapsible "Videos" section on the book page.',
    }),
    defineField({
      name: 'previewUrl',
      title: 'Preview PDF',
      type: 'url',
      // Interim: we collect a LINK rather than a file, because form uploads land
      // in Drive where the import cannot fetch them (see scripts/lib/sanity.mjs).
      // A URL we can just point at sidesteps that. Revisit once intake moves off
      // Drive — a hosted file asset would then be the sturdier choice.
      description:
        'Optional. A direct, public link to a SHORT preview PDF — the first few pages, not the whole book. It must open the PDF straight away for anyone, with no sign-in: a Google Drive "share" link that shows a login or a preview page will not do. Shown as a "Read a preview" button on the book page.',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'creator.name', media: 'cover' } },
})

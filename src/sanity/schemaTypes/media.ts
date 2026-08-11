import { defineType, defineField } from 'sanity'

import { GENRES, MEDIA_KINDS } from '@/lib/taxonomy'
import { CheckboxSelectAllInput } from '@/sanity/components/CheckboxSelectAllInput'
import { validateFeedUrl } from '../validateFeedUrl'
import { slugField } from './slugField'

/**
 * A media outlet that covers independent comics — a podcast, channel, review
 * site, or newsletter. Deliberately NOT a creator and NOT a comic: it covers
 * the work, it does not make it, so it lives in its own type and never appears
 * on /creators or /books.
 *
 * The point is a curated, mission-aligned list a creator can reach out to when
 * releasing a project (hence `genresCovered` and `pitchInfo`), and a discovery
 * surface for readers. It is presented as an independent, unaffiliated list —
 * listing here is not an ND Riot endorsement (see the /media page copy).
 */
export default defineType({
  name: 'media',
  title: 'Media',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'The show, channel, site, or newsletter name.',
      validation: (rule) => rule.required(),
    }),
    slugField('name', '/media/their-slug'),
    defineField({
      name: 'kinds',
      title: 'Kinds',
      type: 'array',
      of: [{ type: 'string', options: { list: [...MEDIA_KINDS] } }],
      options: { layout: 'grid' },
      description:
        'What forms the coverage takes — an outlet can be more than one (a podcast that is also on YouTube). At least one. To add a kind, edit src/lib/taxonomy.ts.',
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo or artwork',
      type: 'imageWithAlt',
      description:
        'Optional — the name is shown as text when there is none, which is a fine result. Upload a version that reads on a near-black background.',
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'text',
      rows: 3,
      description: 'A sentence or two — who they are and what they cover.',
    }),
    defineField({
      name: 'genresCovered',
      title: 'Genres covered',
      type: 'array',
      of: [{ type: 'string', options: { list: [...GENRES] } }],
      // No `layout: 'grid'` — the default renders as checkboxes, which the
      // custom input augments with a Select all / Clear all toggle.
      components: { input: CheckboxSelectAllInput },
      description:
        'What they tend to cover, so a comic maker can find media aligned with their project. To add a genre, edit src/lib/taxonomy.ts.',
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'pitchInfo',
      title: 'How to get covered',
      type: 'text',
      rows: 3,
      description:
        'Optional. How a creator can submit or pitch — a submission form, an email, "open to review copies", or their stated policy. This is the outreach value.',
    }),
    defineField({
      name: 'links',
      title: 'Where to find it',
      type: 'array',
      of: [{ type: 'mediaLink' }],
      description: 'Links to the show, channel, or site.',
    }),
    defineField({
      name: 'feedUrl',
      title: 'RSS / Atom feed URL',
      type: 'url',
      description:
        "Optional. The outlet's own feed. When set — and only with their consent below — ND Riot shows their latest items on this profile, each linking out. Validated live: it must be a real feed.",
      validation: (rule) =>
        rule.uri({ scheme: ['http', 'https'] }).custom((value) => validateFeedUrl(value)),
    }),
    defineField({
      name: 'feedConsent',
      title: 'Outlet consents to feed display',
      type: 'boolean',
      description:
        'Only show their feed with permission — this is syndication by invitation, not scraping. Leave off and the feed stays hidden even if a URL is set.',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'name', kinds: 'kinds', media: 'logo' },
    prepare: ({ title, kinds, media }) => ({
      title,
      subtitle: Array.isArray(kinds) ? kinds.join(' · ') : undefined,
      media,
    }),
  },
})

import { defineType, defineField } from 'sanity'

/**
 * Every reader-facing string that isn't part of a content document.
 *
 * A singleton: exactly one of these exists, pinned to the document ID
 * `siteSettings` by the structure in `src/sanity/structure.ts` and hidden from
 * the global create menu in `sanity.config.ts`.
 *
 * Fields are grouped into objects rather than left flat — 25 loose text inputs
 * in one form is unusable, and the objects collapse in the Studio.
 */
export default defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'home', title: 'Homepage' },
    { name: 'sections', title: 'Section headings' },
    { name: 'empty', title: 'Empty states' },
    { name: 'nav', title: 'Navigation' },
  ],
  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site title',
      type: 'string',
      group: 'general',
      description: 'Browser tab title and the default for link previews.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'siteDescription',
      title: 'Site description',
      type: 'text',
      rows: 2,
      group: 'general',
      description:
        'Used by search engines and link previews. One or two sentences describing ND Riot.',
      validation: (rule) => rule.max(160).warning('Search engines cut off around 160 characters.'),
    }),
    defineField({
      name: 'footer',
      title: 'Footer line',
      type: 'string',
      group: 'general',
      description: 'The single line at the bottom of every page.',
    }),

    defineField({
      name: 'home',
      title: 'Homepage',
      type: 'object',
      group: 'home',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'headlineLead',
          title: 'Headline — first line',
          type: 'string',
          description: 'Rendered in white, above the accent line.',
        }),
        defineField({
          name: 'headlineAccent',
          title: 'Headline — accent line',
          type: 'string',
          description: 'Rendered in pink, on its own line beneath the first.',
        }),
        defineField({
          name: 'intro',
          title: 'Intro paragraph',
          type: 'text',
          rows: 3,
          description: 'The paragraph under the headline.',
        }),
        defineField({
          name: 'featuredHeading',
          title: 'Featured section heading',
          type: 'string',
        }),
        defineField({ name: 'genresHeading', title: 'Genres section heading', type: 'string' }),
        defineField({ name: 'booksHeading', title: 'Books section heading', type: 'string' }),
        defineField({ name: 'creatorsHeading', title: 'Creators section heading', type: 'string' }),
        defineField({
          name: 'viewAllLabel',
          title: '"View all" link label',
          type: 'string',
          description: 'Used on every section that links to a full listing.',
        }),
      ],
    }),

    defineField({
      name: 'sections',
      title: 'Section headings',
      type: 'object',
      group: 'sections',
      options: { collapsible: true, collapsed: false },
      description: 'Headings and button labels used across the inner pages.',
      fields: [
        defineField({ name: 'editorialHeading', title: 'Editorial page title', type: 'string' }),
        defineField({ name: 'columnsHeading', title: 'Columns heading', type: 'string' }),
        defineField({ name: 'interviewsHeading', title: 'Interviews heading', type: 'string' }),
        defineField({ name: 'booksHeading', title: 'Books page title', type: 'string' }),
        defineField({ name: 'creatorsHeading', title: 'Creators page title', type: 'string' }),
        defineField({ name: 'downloadsHeading', title: 'Downloads page title', type: 'string' }),
        defineField({
          name: 'downloadCta',
          title: 'Download button label',
          type: 'string',
          description: 'On a download page, e.g. "Download".',
        }),
        defineField({
          name: 'kickstarterCta',
          title: 'Kickstarter button label',
          type: 'string',
          description: 'On a book page with a live campaign.',
        }),
        defineField({
          name: 'creatorBooksHeading',
          title: "Creator page — books heading",
          type: 'string',
        }),
        defineField({
          name: 'creatorOrganizationsHeading',
          title: 'Creator page — organizations heading',
          type: 'string',
          description: 'e.g. "Member of".',
        }),
        defineField({
          name: 'creatorFavoritesHeading',
          title: 'Creator page — favorite creators heading',
          type: 'string',
        }),
      ],
    }),

    defineField({
      name: 'empty',
      title: 'Empty states',
      type: 'object',
      group: 'empty',
      options: { collapsible: true, collapsed: false },
      description:
        'Shown when a listing has nothing in it. Readers see these, so keep them useful rather than apologetic.',
      fields: [
        defineField({ name: 'books', title: 'No books', type: 'string' }),
        defineField({ name: 'creators', title: 'No creators', type: 'string' }),
        defineField({ name: 'genreBooks', title: 'No books in a genre', type: 'string' }),
        defineField({ name: 'features', title: 'Nothing featured', type: 'string' }),
        defineField({ name: 'columns', title: 'No columns', type: 'string' }),
        defineField({ name: 'interviews', title: 'No interviews', type: 'string' }),
        defineField({ name: 'downloads', title: 'No downloads', type: 'string' }),
      ],
    }),

    defineField({
      name: 'nav',
      title: 'Main navigation',
      type: 'array',
      group: 'nav',
      description: 'Header links, in order. Keep it short — this row does not collapse.',
      of: [
        {
          type: 'object',
          name: 'navItem',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Path',
              type: 'string',
              description: 'A site path beginning with "/", e.g. /creators.',
              validation: (rule) =>
                rule.required().custom((value) =>
                  typeof value === 'string' && value.startsWith('/')
                    ? true
                    : 'Must be a site path starting with "/".',
                ),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

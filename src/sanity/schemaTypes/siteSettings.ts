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
    { name: 'hero', title: 'Hero' },
    { name: 'home', title: 'Homepage' },
    { name: 'sections', title: 'Section headings' },
    { name: 'empty', title: 'Empty states' },
    { name: 'join', title: 'Join page' },
    { name: 'contact', title: 'Contact page' },
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
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      options: { collapsible: true, collapsed: false },
      description:
        'The first slide of the homepage carousel. The remaining slides come from Homepage feature.',
      fields: [
        defineField({
          name: 'background',
          title: 'Background image',
          type: 'imageWithAlt',
          description:
            'Runs full-bleed behind every slide and stays put as they change. A dense collage works best — it is darkened heavily in code, so detail matters more than contrast. Decorative, so alt text can stay blank.',
        }),
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'string',
          description: 'The h1. Type any quote marks you want — they are not added for you.',
        }),
        defineField({
          name: 'body',
          title: 'Body',
          type: 'array',
          of: [
            {
              type: 'block',
              // Headings and lists have no place in a hero paragraph, and
              // links would compete with the buttons directly beneath.
              styles: [{ title: 'Paragraph', value: 'normal' }],
              lists: [],
              marks: { decorators: [{ title: 'Bold', value: 'strong' }], annotations: [] },
            },
          ],
          description: 'A few short paragraphs. Bold carries the emphasis; there is no other styling.',
        }),
        defineField({
          name: 'featureCtaLabel',
          title: 'Featured slide button label',
          type: 'string',
          description:
            'On slides 2 onward, the button under a featured book or creator — e.g. "Read more". One label covers them all.',
        }),
        defineField({
          name: 'ctas',
          title: 'Buttons',
          type: 'array',
          description: 'Up to two. The first is pink, the second white.',
          validation: (rule) => rule.max(2),
          of: [
            {
              type: 'object',
              name: 'cta',
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
    }),

    defineField({
      name: 'home',
      title: 'Homepage',
      type: 'object',
      group: 'home',
      options: { collapsible: true, collapsed: false },
      fields: [
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
          name: 'genreBooksHeading',
          title: 'Category page — books heading',
          type: 'string',
          description: 'e.g. "Comics".',
        }),
        defineField({
          name: 'discoverLabel',
          title: 'Randomise button label',
          type: 'string',
          description:
            'Shuffles the homepage rows. Pressing it again reshuffles. e.g. "Discover".',
        }),
        defineField({
          name: 'searchHomeLabel',
          title: 'Homepage search placeholder',
          type: 'string',
          description: 'Searches comics and makers together, e.g. "Search comics and makers".',
        }),
        defineField({
          name: 'searchBooksLabel',
          title: 'Comics search placeholder',
          type: 'string',
          description: 'e.g. "Search titles and makers". Also the accessible label for the field.',
        }),
        defineField({
          name: 'searchCreatorsLabel',
          title: 'Makers search placeholder',
          type: 'string',
          description: 'e.g. "Search makers and studios".',
        }),
        defineField({
          name: 'everythingElseHeading',
          title: 'Heading above the fallback row',
          type: 'string',
          description:
            'Shown under an empty filtered result, above a sample of everything else — e.g. "While you are here".',
        }),
        defineField({
          name: 'genreCreatorsHeading',
          title: 'Category page — creators heading',
          type: 'string',
          description: 'e.g. "Makers working in this genre".',
        }),
        defineField({
          name: 'downloadCta',
          title: 'Download button label',
          type: 'string',
          description: 'On a download page, e.g. "Download".',
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
          name: 'openToCollaborationLabel',
          title: 'Creator page — collaboration badge',
          type: 'string',
          description: 'Shown on creators who are open to collaboration, e.g. "Open to collaboration".',
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
        defineField({ name: 'genreCreators', title: 'No creators in a genre', type: 'string' }),
        defineField({
          name: 'filteredBooks',
          title: 'No comics match the filters',
          type: 'string',
          description: 'Shown when filtering empties the page. Suggest widening rather than apologising.',
        }),
        defineField({
          name: 'filteredCreators',
          title: 'No makers match the filters',
          type: 'string',
        }),
        defineField({ name: 'columns', title: 'No columns', type: 'string' }),
        defineField({ name: 'interviews', title: 'No interviews', type: 'string' }),
        defineField({ name: 'downloads', title: 'No downloads', type: 'string' }),
      ],
    }),

    defineField({
      name: 'join',
      title: 'Join page',
      type: 'object',
      group: 'join',
      options: { collapsible: true, collapsed: false },
      description: 'The page at /join, where a creator asks to be listed.',
      fields: [
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          description: 'The h1.',
        }),
        defineField({
          name: 'body',
          title: 'Body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{ title: 'Paragraph', value: 'normal' }],
              lists: [{ title: 'Bullet', value: 'bullet' }],
              marks: { decorators: [{ title: 'Bold', value: 'strong' }], annotations: [] },
            },
          ],
          description:
            'What you are looking for and what happens after someone submits. Saying how long a reply takes is the single most useful thing here — it stops people wondering whether it worked.',
        }),
        defineField({
          name: 'ctaLabel',
          title: 'Button label',
          type: 'string',
          description: 'e.g. "Get listed".',
        }),
        defineField({
          name: 'formUrl',
          title: 'Form link',
          type: 'url',
          description:
            'Where the button goes. A field rather than code so the form can be replaced, paused, or swapped for an on-site version without a deploy.',
        }),
      ],
    }),

    defineField({
      name: 'contact',
      title: 'Contact page',
      type: 'object',
      group: 'contact',
      options: { collapsible: true, collapsed: false },
      description:
        'The page at /contact. Messages are emailed to you — they are never stored in the CMS, because every document here is publicly readable and a stranger’s message and address are not ours to publish.',
      fields: [
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          description: 'The h1, e.g. "Get in touch".',
        }),
        defineField({
          name: 'linkLabel',
          title: 'Footer link label',
          type: 'string',
          description:
            'The link to this page, shown in the footer rather than the main nav — e.g. "Contact". Kept out of the header so Join stays the single call to action.',
        }),
        defineField({
          name: 'body',
          title: 'Intro',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{ title: 'Paragraph', value: 'normal' }],
              lists: [],
              marks: { decorators: [{ title: 'Bold', value: 'strong' }], annotations: [] },
            },
          ],
          description:
            'A sentence or two above the form. Saying who should write and how fast you reply is the most useful thing here.',
        }),
        defineField({
          name: 'nameLabel',
          title: 'Name field label',
          type: 'string',
          description: 'e.g. "Your name".',
        }),
        defineField({
          name: 'emailLabel',
          title: 'Email field label',
          type: 'string',
          description: 'e.g. "Your email". Used so you can reply — it is never published.',
        }),
        defineField({
          name: 'subjectLabel',
          title: 'Subject field label',
          type: 'string',
          description: 'e.g. "Subject". Optional for the sender.',
        }),
        defineField({
          name: 'messageLabel',
          title: 'Message field label',
          type: 'string',
          description: 'e.g. "Message".',
        }),
        defineField({
          name: 'submitLabel',
          title: 'Submit button label',
          type: 'string',
          description: 'e.g. "Send".',
        }),
        defineField({
          name: 'successMessage',
          title: 'Success message',
          type: 'string',
          description: 'Shown after a message sends, e.g. "Thanks — we’ll be in touch."',
        }),
        defineField({
          name: 'errorMessage',
          title: 'Error message',
          type: 'string',
          description:
            'Shown if sending fails. Give an alternative if you have one — the form is not the only way to reach you.',
        }),
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

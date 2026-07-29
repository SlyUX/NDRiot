import { defineType, defineField, defineArrayMember } from 'sanity'

/** A site-internal path: present and starting with "/". Shared by nav fields. */
const sitePath = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') ? true : 'Must be a site path starting with "/".'

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
    { name: 'join', title: 'Join the Riot' },
    { name: 'creatorIntake', title: 'Comic Maker intake form' },
    { name: 'bookIntake', title: 'Comic intake form' },
    { name: 'mediaIntake', title: 'Media intake form' },
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
      name: 'discordUrl',
      title: 'Discord invite URL',
      type: 'url',
      group: 'general',
      description: 'The ND Riot Discord invite — shown as an icon in the nav and footer. Blank hides it.',
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
          name: 'tagline',
          title: 'Mobile tagline',
          type: 'string',
          description:
            'Shown under the logo on phones, where the carousel is hidden — e.g. "Elevating Independent Comics".',
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
          title: 'Featured book link label',
          type: 'string',
          description: 'The "read more" affordance on the featured book — e.g. "Read more".',
        }),
        defineField({
          name: 'featuredHeading',
          title: 'Featured book label',
          type: 'string',
          description: 'Small label over the featured book — e.g. "Featured".',
        }),
        defineField({
          name: 'newHeading',
          title: 'New books & creators heading',
          type: 'string',
          description: 'Over the rail beside the featured book — e.g. "New Books & Creators".',
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
        defineField({ name: 'editorialHeading', title: 'Editorial section heading', type: 'string' }),
        defineField({ name: 'mediaHeading', title: 'Media section heading (home row)', type: 'string' }),
        defineField({
          name: 'viewAllLabel',
          title: '"View all" link label',
          type: 'string',
          description: 'Used on every section that links to a full listing.',
        }),
        defineField({
          name: 'viewMoreLabel',
          title: '"View more" button label',
          type: 'string',
          description:
            'The homepage rows open with two rows and reveal the next two on this button, e.g. "View more". "View all" (above) still links to the complete listing.',
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
          description: 'Searches comics and creators together, e.g. "Search comics and creators".',
        }),
        defineField({
          name: 'searchBooksLabel',
          title: 'Comics search placeholder',
          type: 'string',
          description: 'e.g. "Search titles and creators". Also the accessible label for the field.',
        }),
        defineField({
          name: 'searchCreatorsLabel',
          title: 'Creators search placeholder',
          type: 'string',
          description: 'e.g. "Search creators and studios".',
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
          description: 'e.g. "Creators working in this genre".',
        }),
        defineField({
          name: 'downloadCta',
          title: 'Download button label',
          type: 'string',
          description: 'On a download page, e.g. "Download".',
        }),
        defineField({
          name: 'previewCta',
          title: 'Book preview button label',
          type: 'string',
          description: 'On a book page with a preview PDF, e.g. "Read a preview (PDF)".',
        }),
        defineField({
          name: 'creatorBooksHeading',
          title: "Creator page — books heading",
          type: 'string',
          description: 'Use {name} for the creator’s first name — e.g. "{name}’s Books".',
        }),
        defineField({
          name: 'creatorWorksHeading',
          title: 'Creator page — external works heading',
          type: 'string',
          description:
            'Above the creator’s external book links (works not entered as full documents). Use {name} for their first name — e.g. "Where to find {name}’s work".',
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
        defineField({ name: 'mediaPageHeading', title: 'Media page — title', type: 'string' }),
        defineField({
          name: 'mediaIntro',
          title: 'Media page — intro',
          type: 'text',
          rows: 2,
          description: 'The framing under the title — a resource for creators + readers, unranked.',
        }),
        defineField({
          name: 'mediaDisclaimer',
          title: 'Media page — independence disclaimer',
          type: 'text',
          rows: 2,
          description: 'Makes clear a listing is not an ND Riot endorsement or partnership. Important — keep it.',
        }),
        defineField({ name: 'mediaPitchHeading', title: 'Media detail — "how to get covered" heading', type: 'string' }),
        defineField({ name: 'mediaLinksHeading', title: 'Media detail — links heading', type: 'string' }),
        defineField({ name: 'mediaGenresHeading', title: 'Media page — covered-genres heading', type: 'string' }),
        defineField({
          name: 'creatorFavoritesHeading',
          title: 'Creator page — favorite creators heading',
          type: 'string',
          description:
            'Use {name} for the creator’s first name — e.g. "{name}’s Favorite Creators" renders as "Stephen’s Favorite Creators".',
        }),
        defineField({
          name: 'otherBooksHeading',
          title: 'Book page — more from the creator heading',
          type: 'string',
          description:
            'Above the creator’s other books on a book page. Use {name} for their full name — e.g. "Other books by {name}".',
        }),
        defineField({
          name: 'bookCreatorsHeading',
          title: 'Book page — creator block heading',
          type: 'string',
          description: 'Above the creator card on a book page, e.g. "Creators:".',
        }),
        defineField({
          name: 'editorialAuthorHeading',
          title: 'Editorial page — author block heading',
          type: 'string',
          description: 'Above the author card at the foot of a column/interview, e.g. "Author:".',
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
          description: 'Shown when filtering empties the page. Suggest widening rather than apologizing.',
        }),
        defineField({
          name: 'filteredCreators',
          title: 'No creators match the filters',
          type: 'string',
        }),
        defineField({ name: 'columns', title: 'No columns', type: 'string' }),
        defineField({ name: 'interviews', title: 'No interviews', type: 'string' }),
        defineField({ name: 'downloads', title: 'No downloads', type: 'string' }),
        defineField({ name: 'media', title: 'No media', type: 'string' }),
      ],
    }),

    defineField({
      name: 'join',
      title: 'Join page',
      type: 'object',
      group: 'join',
      options: { collapsible: true, collapsed: false },
      description:
        'The /join funnel hub and the creator form page at /join/creators. The funnel fields below drive the hub; the heading/body/CTA fields drive the creator form page.',
      fields: [
        defineField({
          name: 'funnelHeading',
          title: 'Funnel · Heading',
          type: 'string',
          description: 'The h1 on /join, the hub that routes people to the right path in.',
        }),
        defineField({
          name: 'funnelIntro',
          title: 'Funnel · Intro',
          type: 'text',
          rows: 2,
          description: 'One line under the funnel heading.',
        }),
        defineField({
          name: 'creatorsLabel',
          title: 'Funnel · Creators card label',
          type: 'string',
          description: 'Title of the card that leads to the creator form.',
        }),
        defineField({
          name: 'creatorsDesc',
          title: 'Funnel · Creators card description',
          type: 'string',
        }),
        defineField({
          name: 'contactLabel',
          title: 'Funnel · Contact card label',
          type: 'string',
          description: 'Title of the card that leads to the contact page.',
        }),
        defineField({
          name: 'contactDesc',
          title: 'Funnel · Contact card description',
          type: 'string',
        }),
        defineField({
          name: 'mediaLabel',
          title: 'Funnel · Media card label',
          type: 'string',
          description: 'Title of the card that leads to the media form.',
        }),
        defineField({
          name: 'mediaDesc',
          title: 'Funnel · Media card description',
          type: 'string',
        }),
        defineField({
          name: 'readersLabel',
          title: 'Funnel · Readers card label',
          type: 'string',
          description: 'Title of the (not-yet-live) reader-profiles card.',
        }),
        defineField({
          name: 'readersDesc',
          title: 'Funnel · Readers card description',
          type: 'string',
        }),
        defineField({
          name: 'readersBadge',
          title: 'Funnel · Readers card badge',
          type: 'string',
          description: 'Small tag on the readers card, e.g. "Coming soon".',
        }),
        defineField({
          name: 'heading',
          title: 'Creator form · Heading',
          type: 'string',
          description: 'The h1 on /join/creators.',
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
          title: 'Google Form fallback link label',
          type: 'string',
          description:
            'The on-site form is primary now; this labels the small fallback link to the old Google Form beneath it — e.g. "Form not working? Submit via Google Forms".',
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
      name: 'creatorIntake',
      title: 'Comic Maker intake form',
      type: 'object',
      group: 'creatorIntake',
      options: { collapsible: true, collapsed: true },
      description:
        'Labels for the on-site "get listed" form on the Join page. The form writes a review draft straight into the Studio for you to publish — every label here is what a creator filling it in reads. The option lists (genres, formats, audience) are not here: they come from the site’s taxonomy so they can never drift.',
      fields: [
        defineField({
          name: 'heading',
          title: 'Form heading',
          type: 'string',
          description: 'Above the form, under the Join page intro — e.g. "Add your details".',
        }),
        defineField({
          name: 'editHeading',
          title: 'Form heading — editing',
          type: 'string',
          description: 'Shown instead of the create heading when a signed-in creator is editing their own profile.',
        }),
        defineField({
          name: 'intro',
          title: 'Form intro line',
          type: 'string',
          description: 'One line under the heading, e.g. what is required vs optional.',
        }),
        defineField({
          name: 'updatePrompt',
          title: 'Update — prompt',
          type: 'string',
          description: 'Heads the "updating an existing profile?" picker above the form.',
        }),
        defineField({
          name: 'updateSelectLabel',
          title: 'Update — search field placeholder',
          type: 'string',
          description: 'Placeholder in the searchable profile picker, e.g. "Search your name…".',
        }),
        defineField({ name: 'updateNoMatchLabel', title: 'Update — no-match line', type: 'string' }),
        defineField({ name: 'updateSkipHint', title: 'Update — "I\'m new" hint', type: 'string' }),
        defineField({
          name: 'editingNotice',
          title: 'Update — editing notice',
          type: 'text',
          rows: 2,
          description:
            'Shown once a profile is loaded for editing. Use {name} for the profile’s name. Say that blanks keep the live value and a human reviews the change.',
        }),
        defineField({ name: 'editingResetLabel', title: 'Update — "add new instead" link', type: 'string' }),
        defineField({ name: 'sectionYou', title: 'Section: who you are', type: 'string' }),
        defineField({ name: 'sectionWork', title: 'Section: your work', type: 'string' }),
        defineField({ name: 'sectionFind', title: 'Section: where to find you', type: 'string' }),
        defineField({ name: 'sectionPictures', title: 'Section: pictures', type: 'string' }),
        defineField({ name: 'sectionPermission', title: 'Section: permission', type: 'string' }),
        defineField({ name: 'nameLabel', title: 'Name label', type: 'string' }),
        defineField({ name: 'slugLabel', title: 'Web address label', type: 'string' }),
        defineField({ name: 'slugHint', title: 'Web address hint', type: 'string' }),
        defineField({ name: 'studioLabel', title: 'Studio label', type: 'string' }),
        defineField({ name: 'studioSelectPlaceholder', title: 'Studio — dropdown placeholder', type: 'string' }),
        defineField({
          name: 'studioCreateLabel',
          title: 'Studio — "create it" lead-in',
          type: 'string',
          description: 'Introduces the create-a-studio fields below the dropdown.',
        }),
        defineField({ name: 'studioNamePlaceholder', title: 'Studio — name placeholder', type: 'string' }),
        defineField({ name: 'studioUrlPlaceholder', title: 'Studio — URL placeholder', type: 'string' }),
        defineField({ name: 'studioLogoLabel', title: 'Studio — logo label', type: 'string' }),
        defineField({ name: 'studioLogoHint', title: 'Studio — logo hint', type: 'string' }),
        defineField({ name: 'orgsLabel', title: 'Collectives label', type: 'string' }),
        defineField({ name: 'orgAddLabel', title: 'Add-organization legend', type: 'string' }),
        defineField({
          name: 'orgAddHint',
          title: 'Add-organization hint',
          type: 'string',
          description: 'Under the name + URL rows for adding an org that isn’t listed.',
        }),
        defineField({ name: 'orgNamePlaceholder', title: 'Add-organization — name placeholder', type: 'string' }),
        defineField({ name: 'locationLabel', title: 'Location label', type: 'string' }),
        defineField({ name: 'bioLabel', title: 'About-your-work label', type: 'string' }),
        defineField({ name: 'formatsLabel', title: 'Formats label', type: 'string' }),
        defineField({ name: 'genresLabel', title: 'Genres label', type: 'string' }),
        defineField({
          name: 'genresHint',
          title: 'Genres hint',
          type: 'string',
          description: 'e.g. "Pick up to three." The three-genre limit is enforced either way.',
        }),
        defineField({ name: 'collabLabel', title: 'Collaboration label', type: 'string' }),
        defineField({ name: 'collabYesLabel', title: 'Collaboration — yes option', type: 'string' }),
        defineField({ name: 'collabNoLabel', title: 'Collaboration — no option', type: 'string' }),
        defineField({ name: 'websiteLabel', title: 'Website label', type: 'string' }),
        defineField({ name: 'socialsLabel', title: 'Socials label', type: 'string' }),
        defineField({
          name: 'socialsHint',
          title: 'Socials hint',
          type: 'string',
          description: 'Under the platform + URL rows, e.g. "Pick a platform and paste your profile link."',
        }),
        defineField({
          name: 'socialPlatformPlaceholder',
          title: 'Socials — platform dropdown placeholder',
          type: 'string',
          description: 'The unselected option in each row’s platform dropdown, e.g. "Choose a platform". The platform list itself comes from the site taxonomy.',
        }),
        defineField({
          name: 'socialHandlePlaceholder',
          title: 'Socials — handle placeholder',
          type: 'string',
          description: 'Placeholder for the account-name field shown after the platform prefix, e.g. "yourname".',
        }),
        defineField({
          name: 'worksLabel',
          title: 'Work links — label',
          type: 'string',
          description: 'e.g. "Where can readers find your work?".',
        }),
        defineField({
          name: 'worksHint',
          title: 'Work links — help text',
          type: 'text',
          rows: 3,
          description:
            'Guidance under the platform-name + URL rows. Steer people to platform PROFILE pages (Amazon Author, Webtoon Series), not individual book pages.',
        }),
        defineField({ name: 'workPlatformPlaceholder', title: 'Work links — platform placeholder', type: 'string' }),
        defineField({ name: 'workUrlPlaceholder', title: 'Work links — URL placeholder', type: 'string' }),
        defineField({ name: 'workAddLabel', title: 'Work links — add-row button', type: 'string' }),
        defineField({ name: 'workRemoveLabel', title: 'Work links — remove-row label', type: 'string' }),
        defineField({ name: 'photoLabel', title: 'Photo upload label', type: 'string' }),
        defineField({ name: 'photoHint', title: 'Photo upload hint', type: 'string', description: 'e.g. "PNG or JPG, up to 8MB."' }),
        defineField({
          name: 'photoCurrentHint',
          title: 'Photo — current-image note',
          type: 'string',
          description: 'Shown beside the existing avatar when a creator is editing, so they know a re-upload is optional.',
        }),
        defineField({ name: 'photoAltLabel', title: 'Photo description label', type: 'string' }),
        defineField({
          name: 'photoAltHint',
          title: 'Photo description hint',
          type: 'string',
          description: 'The alt text prompt — describe what the image shows, for readers who can’t see it.',
        }),
        defineField({ name: 'imageTypeError', title: 'Image — wrong-type error', type: 'string' }),
        defineField({ name: 'imageSizeError', title: 'Image — too-large error', type: 'string' }),
        defineField({
          name: 'signInPrompt',
          title: 'Sign-in — heading',
          type: 'string',
          description: 'Shown to a signed-out visitor above the sign-in button.',
        }),
        defineField({
          name: 'signInBody',
          title: 'Sign-in — explanation',
          type: 'text',
          rows: 2,
          description: 'Why sign-in is required. Reassure it is identity-only and note the Google Form fallback.',
        }),
        defineField({ name: 'signInButton', title: 'Sign-in — button label', type: 'string' }),
        defineField({ name: 'signedInLabel', title: 'Signed-in prefix (before the email)', type: 'string' }),
        defineField({ name: 'signOutLabel', title: 'Sign-out link label', type: 'string' }),
        defineField({
          name: 'permissionStatement',
          title: 'Permission checkbox statement',
          type: 'text',
          rows: 2,
          description: 'The consent a creator ticks — a real permission record. Word it plainly.',
        }),
        defineField({ name: 'anythingElseLabel', title: 'Anything-else label', type: 'string' }),
        defineField({ name: 'submitLabel', title: 'Submit button label', type: 'string' }),
        defineField({
          name: 'successMessage',
          title: 'Success message',
          type: 'text',
          rows: 3,
          description: 'Shown after a submission saves. Say what happens next — a person reviews it, then it goes live.',
        }),
        defineField({ name: 'errorMessage', title: 'Error message', type: 'string' }),
        defineField({
          name: 'optionalLabel',
          title: '"Optional" marker',
          type: 'string',
          description: 'The small marker shown on optional fields, e.g. "optional".',
        }),
      ],
    }),

    defineField({
      name: 'bookIntake',
      title: 'Comic intake form',
      type: 'object',
      group: 'bookIntake',
      options: { collapsible: true, collapsed: true },
      description:
        'Labels for the on-site "add a comic" form (/join/books). Generic strings (sign-in button, add/remove, image errors) are shared with the creator form. Option lists (genres, formats, statuses, link kinds) come from the taxonomy.',
      fields: [
        defineField({ name: 'heading', title: 'Form heading (create)', type: 'string' }),
        defineField({ name: 'editHeading', title: 'Form heading (editing)', type: 'string' }),
        defineField({ name: 'intro', title: 'Form intro line', type: 'string' }),
        defineField({ name: 'signInPrompt', title: 'Sign-in — heading', type: 'string' }),
        defineField({ name: 'signInBody', title: 'Sign-in — explanation', type: 'text', rows: 2 }),
        defineField({ name: 'updatePrompt', title: 'Update — prompt', type: 'string' }),
        defineField({ name: 'updateSelectLabel', title: 'Update — search placeholder', type: 'string' }),
        defineField({ name: 'updateNoMatchLabel', title: 'Update — no-match line', type: 'string' }),
        defineField({ name: 'updateSkipHint', title: 'Update — "new one" hint', type: 'string' }),
        defineField({ name: 'editingNotice', title: 'Update — editing notice ({name})', type: 'text', rows: 2 }),
        defineField({ name: 'editingResetLabel', title: 'Update — "add new instead" link', type: 'string' }),
        defineField({ name: 'sectionWhat', title: 'Section: what it is', type: 'string' }),
        defineField({ name: 'sectionClassification', title: 'Section: classification', type: 'string' }),
        defineField({ name: 'sectionWords', title: 'Section: words', type: 'string' }),
        defineField({ name: 'sectionCover', title: 'Section: cover', type: 'string' }),
        defineField({ name: 'sectionFind', title: 'Section: where to find it', type: 'string' }),
        defineField({ name: 'sectionPermission', title: 'Section: permission', type: 'string' }),
        defineField({ name: 'titleLabel', title: 'Title label', type: 'string' }),
        defineField({ name: 'slugLabel', title: 'Web address label', type: 'string' }),
        defineField({ name: 'slugHint', title: 'Web address hint', type: 'string' }),
        defineField({ name: 'creatorLabel', title: 'Creator label', type: 'string' }),
        defineField({ name: 'creatorHint', title: 'Creator hint', type: 'string' }),
        defineField({ name: 'formatLabel', title: 'Format label', type: 'string' }),
        defineField({ name: 'genresLabel', title: 'Genres label', type: 'string' }),
        defineField({ name: 'genresHint', title: 'Genres hint', type: 'string' }),
        defineField({ name: 'maturityLabel', title: 'Audience label', type: 'string' }),
        defineField({ name: 'maturitySkipLabel', title: 'Audience "rather not say"', type: 'string' }),
        defineField({ name: 'statusLabel', title: 'Status label', type: 'string' }),
        defineField({ name: 'statusSkipLabel', title: 'Status "not sure"', type: 'string' }),
        defineField({ name: 'issueCountLabel', title: 'Issues-available label', type: 'string' }),
        defineField({ name: 'issueCountHint', title: 'Issues-available hint', type: 'string' }),
        defineField({ name: 'shortDescLabel', title: 'Short description label', type: 'string' }),
        defineField({ name: 'shortDescHint', title: 'Short description hint', type: 'string' }),
        defineField({ name: 'fullDescLabel', title: 'Full description label', type: 'string' }),
        defineField({ name: 'fullDescHint', title: 'Full description hint', type: 'string' }),
        defineField({ name: 'coverLabel', title: 'Cover label', type: 'string' }),
        defineField({ name: 'coverHint', title: 'Cover hint', type: 'string' }),
        defineField({ name: 'coverAltLabel', title: 'Cover description label', type: 'string' }),
        defineField({ name: 'coverAltHint', title: 'Cover description hint', type: 'string' }),
        defineField({ name: 'previewUrlLabel', title: 'Preview PDF label', type: 'string' }),
        defineField({ name: 'previewUrlHint', title: 'Preview PDF hint', type: 'string' }),
        defineField({ name: 'linksLabel', title: 'Links label', type: 'string' }),
        defineField({ name: 'linksHint', title: 'Links hint', type: 'text', rows: 2 }),
        defineField({ name: 'linkKindPlaceholder', title: 'Link — kind placeholder', type: 'string' }),
        defineField({ name: 'linkLabelPlaceholder', title: 'Link — label placeholder', type: 'string' }),
        defineField({ name: 'linkEndDateLabel', title: 'Link — campaign end-date label', type: 'string' }),
        defineField({
          name: 'permissionStatement',
          title: 'Permission checkbox statement',
          type: 'text',
          rows: 2,
        }),
        defineField({ name: 'anythingElseLabel', title: 'Anything-else label', type: 'string' }),
        defineField({ name: 'submitLabel', title: 'Submit button label', type: 'string' }),
        defineField({ name: 'successMessage', title: 'Success message', type: 'text', rows: 3 }),
        defineField({ name: 'errorMessage', title: 'Error message', type: 'string' }),
      ],
    }),

    defineField({
      name: 'mediaIntake',
      title: 'Media intake form',
      type: 'object',
      group: 'mediaIntake',
      options: { collapsible: true, collapsed: true },
      description:
        'Labels for the "list your outlet" form (/join/media). Generic strings (sign-in button, add/remove, image errors) are shared with the creator form.',
      fields: [
        defineField({ name: 'heading', title: 'Form heading (create)', type: 'string' }),
        defineField({ name: 'editHeading', title: 'Form heading (editing)', type: 'string' }),
        defineField({ name: 'intro', title: 'Form intro line', type: 'string' }),
        defineField({ name: 'signInPrompt', title: 'Sign-in — heading', type: 'string' }),
        defineField({ name: 'signInBody', title: 'Sign-in — explanation', type: 'text', rows: 2 }),
        defineField({ name: 'updatePrompt', title: 'Update — prompt', type: 'string' }),
        defineField({ name: 'updateSelectLabel', title: 'Update — search placeholder', type: 'string' }),
        defineField({ name: 'updateNoMatchLabel', title: 'Update — no-match line', type: 'string' }),
        defineField({ name: 'updateSkipHint', title: 'Update — "new one" hint', type: 'string' }),
        defineField({ name: 'editingNotice', title: 'Update — editing notice ({name})', type: 'text', rows: 2 }),
        defineField({ name: 'editingResetLabel', title: 'Update — "add new instead" link', type: 'string' }),
        defineField({ name: 'sectionAbout', title: 'Section: about', type: 'string' }),
        defineField({ name: 'sectionReach', title: 'Section: where to find it', type: 'string' }),
        defineField({ name: 'nameLabel', title: 'Name label', type: 'string' }),
        defineField({ name: 'slugLabel', title: 'Web address label', type: 'string' }),
        defineField({ name: 'slugHint', title: 'Web address hint', type: 'string' }),
        defineField({ name: 'kindLabel', title: 'Kinds label', type: 'string' }),
        defineField({ name: 'kindHint', title: 'Kinds hint', type: 'string' }),
        defineField({ name: 'aboutLabel', title: 'About label', type: 'string' }),
        defineField({ name: 'aboutHint', title: 'About hint', type: 'string' }),
        defineField({ name: 'genresLabel', title: 'Genres-covered label', type: 'string' }),
        defineField({ name: 'genresHint', title: 'Genres-covered hint', type: 'string' }),
        defineField({ name: 'pitchLabel', title: 'How-to-get-covered label', type: 'string' }),
        defineField({ name: 'pitchHint', title: 'How-to-get-covered hint', type: 'string' }),
        defineField({ name: 'logoLabel', title: 'Logo label', type: 'string' }),
        defineField({ name: 'logoHint', title: 'Logo hint', type: 'string' }),
        defineField({ name: 'logoAltLabel', title: 'Logo description label', type: 'string' }),
        defineField({ name: 'logoAltHint', title: 'Logo description hint', type: 'string' }),
        defineField({ name: 'linksLabel', title: 'Links label', type: 'string' }),
        defineField({ name: 'linksHint', title: 'Links hint', type: 'string' }),
        defineField({ name: 'permissionStatement', title: 'Permission checkbox statement', type: 'text', rows: 2 }),
        defineField({ name: 'anythingElseLabel', title: 'Anything-else label', type: 'string' }),
        defineField({ name: 'submitLabel', title: 'Submit button label', type: 'string' }),
        defineField({ name: 'successMessage', title: 'Success message', type: 'text', rows: 3 }),
        defineField({ name: 'errorMessage', title: 'Error message', type: 'string' }),
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
      description:
        'The header, in order. Each item is either a plain Link (e.g. Join) or a Dropdown panel that opens a mega-menu of grouped links. Genres are not listed here — set a group to "Fill with genres" and the site adds them from the code taxonomy, so they never drift out of sync.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navLink',
          title: 'Link',
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
              description: 'A site path beginning with "/", e.g. /join.',
              validation: (rule) => rule.required().custom(sitePath),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        }),
        defineArrayMember({
          type: 'object',
          name: 'navPanel',
          title: 'Dropdown panel',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Landing path',
              type: 'string',
              description:
                'Optional. Where the panel’s own title links to — e.g. /books. Leave blank for a label that only opens the menu.',
              validation: (rule) => rule.custom((value) => !value || sitePath(value)),
            }),
            defineField({
              name: 'groups',
              title: 'Groups',
              type: 'array',
              description: 'Columns inside the dropdown.',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'navGroup',
                  title: 'Group',
                  fields: [
                    defineField({
                      name: 'heading',
                      title: 'Heading',
                      type: 'string',
                      description: 'Optional column heading.',
                    }),
                    defineField({
                      name: 'useGenres',
                      title: 'Fill with genres',
                      type: 'boolean',
                      initialValue: false,
                      description:
                        'Populate this column from the site genre list automatically. When on, the links below are ignored.',
                    }),
                    defineField({
                      name: 'links',
                      title: 'Links',
                      type: 'array',
                      hidden: ({ parent }) => Boolean(parent?.useGenres),
                      of: [
                        defineArrayMember({
                          type: 'object',
                          name: 'navGroupLink',
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
                              description: 'A site path beginning with "/".',
                              validation: (rule) => rule.required().custom(sitePath),
                            }),
                          ],
                          preview: { select: { title: 'label', subtitle: 'href' } },
                        }),
                      ],
                    }),
                  ],
                  preview: {
                    select: { title: 'heading', useGenres: 'useGenres' },
                    prepare: ({ title, useGenres }) => ({
                      title: title || (useGenres ? 'Genres' : 'Group'),
                      subtitle: useGenres ? 'Auto: genres' : undefined,
                    }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'label' },
            prepare: ({ title }) => ({ title, subtitle: 'Dropdown' }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

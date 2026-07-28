import { safeFetch } from '@/lib/queries'
import type { RichText, SanityImage } from '@/lib/types'

/**
 * Reader-facing chrome copy, from the `siteSettings` singleton.
 *
 * Two failure modes have to be survivable, which is why defaults live here:
 *
 *  1. The singleton does not exist yet — GROQ returns null, not an object.
 *  2. It exists but an editor cleared one field — that field is undefined
 *     while its siblings are fine.
 *
 * `getSiteSettings()` resolves both by merging what Sanity returns over these
 * defaults, so consumers get a fully populated object and never need `??` at
 * the point of use.
 *
 * These are DEFAULTS, not content. Sanity overrides every one of them. Do not
 * add a string here without a matching field in `schemaTypes/siteSettings.ts`
 * — a default with no field is unreachable copy an editor cannot change, which
 * is the thing AGENTS.md §2 exists to prevent.
 */

/** A single link — either a plain header item or one row inside a group. */
export interface NavLink {
  label: string
  href: string
}

/** One column inside a dropdown panel. */
export interface NavGroup {
  heading?: string
  /** When true the links come from the genre taxonomy, not from `links`. */
  useGenres?: boolean
  links?: NavLink[]
}

/** A header item: a plain link, or a dropdown that opens a mega-panel. */
export interface NavPanel {
  _type: 'navPanel'
  label: string
  /** Optional landing page the panel title links to. */
  href?: string
  groups?: NavGroup[]
}

export type NavItem = ({ _type: 'navLink' } & NavLink) | NavPanel

export interface Cta {
  label: string
  href: string
}

export interface HeroSettings {
  /** Persists behind every carousel slide. No default — absent means the
   *  hero falls back to a plain background, which is a valid look. */
  background?: SanityImage
  headline: string
  body?: RichText
  /** The hero's identity line — evangelism, not the pitch. */
  tagline: string
  ctas: Cta[]
  /** "Read more" affordance on the featured book. */
  featureCtaLabel: string
  /** Label over the featured book — e.g. "Featured". */
  featuredHeading: string
  /** Heading over the "new books & creators" rail. */
  newHeading: string
}

export interface JoinSettings {
  heading: string
  body?: RichText
  ctaLabel: string
  /** Absent means the page renders without a button rather than a dead link. */
  formUrl?: string
}

/**
 * Every reader-facing label on the on-site creator intake form (§2). Flat
 * strings so `mergeGroup` restores any field an editor clears. The controlled
 * vocabularies (genres/formats/audience) are NOT here — they come from the
 * taxonomy so the form's options can never drift from the schema.
 */
export type CreatorIntakeSettings = {
  heading: string
  intro: string
  updatePrompt: string
  updateSelectLabel: string
  updateLoadLabel: string
  updateSkipHint: string
  editingNotice: string
  editingResetLabel: string
  sectionYou: string
  sectionWork: string
  sectionFind: string
  sectionPictures: string
  sectionPermission: string
  nameLabel: string
  slugLabel: string
  slugHint: string
  studioLabel: string
  orgsLabel: string
  locationLabel: string
  bioLabel: string
  formatsLabel: string
  genresLabel: string
  genresHint: string
  audienceLabel: string
  audienceSkipLabel: string
  collabLabel: string
  collabYesLabel: string
  collabNoLabel: string
  websiteLabel: string
  socialsLabel: string
  socialsHint: string
  worksLabel: string
  worksHint: string
  photoLabel: string
  photoHint: string
  photoAltLabel: string
  photoAltHint: string
  emailLabel: string
  emailHint: string
  permissionStatement: string
  anythingElseLabel: string
  submitLabel: string
  successMessage: string
  errorMessage: string
  optionalLabel: string
}

export interface ContactSettings {
  heading: string
  /** Footer link label — Contact lives in the footer, not the header nav. */
  linkLabel: string
  body?: RichText
  nameLabel: string
  emailLabel: string
  subjectLabel: string
  messageLabel: string
  submitLabel: string
  successMessage: string
  errorMessage: string
}

export interface SiteSettings {
  siteTitle: string
  siteDescription: string
  footer: string
  /** Invite to the ND Riot Discord — shown in the nav and footer. Absent hides them. */
  discordUrl?: string
  hero: HeroSettings
  join: JoinSettings
  creatorIntake: CreatorIntakeSettings
  contact: ContactSettings
  home: {
    genresHeading: string
    booksHeading: string
    creatorsHeading: string
    editorialHeading: string
    viewAllLabel: string
    viewMoreLabel: string
  }
  sections: {
    editorialHeading: string
    columnsHeading: string
    interviewsHeading: string
    booksHeading: string
    creatorsHeading: string
    downloadsHeading: string
    genreBooksHeading: string
    genreCreatorsHeading: string
    everythingElseHeading: string
    discoverLabel: string
    searchHomeLabel: string
    searchBooksLabel: string
    searchCreatorsLabel: string
    downloadCta: string
    previewCta: string
    creatorBooksHeading: string
    creatorWorksHeading: string
    creatorOrganizationsHeading: string
    creatorFavoritesHeading: string
    otherBooksHeading: string
    bookCreatorsHeading: string
    editorialAuthorHeading: string
    openToCollaborationLabel: string
  }
  empty: {
    books: string
    creators: string
    genreBooks: string
    genreCreators: string
    filteredBooks: string
    filteredCreators: string
    columns: string
    interviews: string
    downloads: string
  }
  nav: NavItem[]
}

/** What the query can actually return: everything optional, at both levels. */
type PartialSiteSettings = {
  [K in keyof SiteSettings]?: SiteSettings[K] extends object
    ? SiteSettings[K] extends unknown[]
      ? SiteSettings[K]
      : Partial<SiteSettings[K]>
    : SiteSettings[K]
}

const DEFAULTS: SiteSettings = {
  siteTitle: 'ND Riot',
  siteDescription: 'Independent comics discovery. Support indie comics.',
  footer: 'Support indie comics. · ND Riot',
  discordUrl: 'https://discord.gg/fSSMjE5dw',
  hero: {
    headline: '“The Big Two”',
    tagline: 'Elevating Independent Comics',
    featureCtaLabel: 'Read more',
    featuredHeading: 'Featured',
    newHeading: 'New Books & Creators',
    ctas: [
      { label: 'All Creators', href: '/creators' },
      { label: 'All Comics', href: '/books' },
    ],
  },
  join: {
    heading: 'Get listed',
    // Now labels the fallback link under the native form, not a primary CTA.
    ctaLabel: 'Form not working? Submit via Google Forms',
    formUrl: 'https://forms.gle/STbaVMQ8a6Ap8rL1A',
  },
  creatorIntake: {
    heading: 'Add your details',
    intro:
      'Only a name, a note about your work, and permission to publish are required — skip anything else or add it later.',
    updatePrompt: 'Already on ND Riot and updating your profile?',
    updateSelectLabel: 'Find your profile',
    updateLoadLabel: 'Load its details',
    updateSkipHint: 'New here? Skip this and fill in the form below.',
    editingNotice:
      'You’re updating {name}. Change whatever you like — a change is reviewed before it goes live, and fields you leave blank keep what’s already there.',
    editingResetLabel: 'Add a new profile instead',
    sectionYou: 'Who you are',
    sectionWork: 'Your work',
    sectionFind: 'Where to find you',
    sectionPictures: 'Pictures',
    sectionPermission: 'Permission',
    nameLabel: 'Name you want to be credited by',
    slugLabel: 'Preferred web address',
    slugHint:
      'The end of your page’s link — ndriot.com/creators/your-name. Lowercase letters, numbers and hyphens. Leave blank and we’ll build one from your name.',
    studioLabel: 'Studio or trading name',
    orgsLabel: 'Collectives or organisations you belong to',
    locationLabel: 'Where you’re based',
    bioLabel: 'Tell us about your work',
    formatsLabel: 'What do you make?',
    genresLabel: 'What genres do you work in?',
    genresHint: 'Pick up to three.',
    audienceLabel: 'Who’s it for?',
    audienceSkipLabel: 'Rather not say',
    collabLabel: 'Are you open to collaboration?',
    collabYesLabel: 'Yes — I’m looking for collaborators',
    collabNoLabel: 'Not right now',
    websiteLabel: 'Your website',
    socialsLabel: 'Social links',
    socialsHint: 'One link per line.',
    worksLabel: 'Where can people get your books?',
    worksHint: 'One per line: a title, then its link.',
    photoLabel: 'A photo or avatar of you',
    photoHint: 'PNG or JPG, up to 8MB.',
    photoAltLabel: 'Describe that image',
    photoAltHint:
      'For readers who can’t see it — describe what it shows, not who it is. Skip for a plain headshot.',
    emailLabel: 'Your email',
    emailHint: 'So we can reach you about your listing. Never shown on the site.',
    permissionStatement:
      'I own or have permission to share everything I’ve linked here, and ND Riot can use it to build my profile.',
    anythingElseLabel: 'Anything else?',
    submitLabel: 'Submit for review',
    successMessage:
      'Thanks — your details are in. A person reviews every submission before it goes live, so your page will appear shortly. We’ll be in touch if anything needs a look.',
    errorMessage: 'That didn’t save. Please try again in a moment.',
    optionalLabel: 'optional',
  },
  contact: {
    heading: 'Get in touch',
    linkLabel: 'Contact',
    nameLabel: 'Your name',
    emailLabel: 'Your email',
    subjectLabel: 'Subject',
    messageLabel: 'Message',
    submitLabel: 'Send',
    successMessage: 'Thanks — your message is on its way. We’ll be in touch.',
    errorMessage: 'That didn’t send. Try again in a moment.',
  },
  home: {
    genresHeading: 'Browse by genre',
    booksHeading: 'Books',
    creatorsHeading: 'Creators',
    editorialHeading: 'Editorial',
    viewAllLabel: 'View all',
    viewMoreLabel: 'View more',
  },
  sections: {
    editorialHeading: 'Editorial',
    columnsHeading: 'Columns',
    interviewsHeading: 'Interviews',
    booksHeading: 'Books',
    creatorsHeading: 'Creators',
    downloadsHeading: 'Free Downloads',
    genreBooksHeading: 'Comics',
    genreCreatorsHeading: 'Creators working in this genre',
    everythingElseHeading: 'While you are here',
    discoverLabel: 'Discover',
    searchHomeLabel: 'Search comics and creators',
    searchBooksLabel: 'Search titles and creators',
    searchCreatorsLabel: 'Search creators and studios',
    downloadCta: 'Download',
    previewCta: 'Read a preview (PDF)',
    creatorBooksHeading: '{name}’s Books',
    creatorWorksHeading: 'Where to find {name}’s work',
    creatorOrganizationsHeading: 'Member of',
    creatorFavoritesHeading: '{name}’s Favorite Creators',
    otherBooksHeading: 'Other books by {name}',
    bookCreatorsHeading: 'Creators:',
    editorialAuthorHeading: 'Author:',
    openToCollaborationLabel: 'Open to collaboration',
  },
  empty: {
    books: 'No books yet — add creators and books in the Studio.',
    creators: 'No creators yet.',
    genreBooks: 'No books in this genre yet.',
    genreCreators: 'No creators list this genre yet.',
    filteredBooks: 'Nothing matches all of those at once. Try loosening one.',
    filteredCreators: 'No creators match all of those at once. Try loosening one.',
    columns: 'No columns yet.',
    interviews: 'No interviews yet.',
    downloads: 'No downloads yet.',
  },
  // Books opens a dropdown gathering the ways into the catalogue — genres,
  // downloads, and the magazine — with "All Books" for the full listing.
  // Creators stays a plain top-level link; Editorial is its own dropdown; Join
  // is the CTA; Contact lives in the footer.
  nav: [
    {
      _type: 'navPanel',
      label: 'Books',
      href: '/books',
      groups: [
        { heading: 'Genres', useGenres: true },
        {
          heading: 'More',
          links: [
            { label: 'Downloads', href: '/downloads' },
            { label: 'ND Riot Magazine', href: '/magazine' },
          ],
        },
      ],
    },
    { _type: 'navLink', label: 'Creators', href: '/creators' },
    {
      _type: 'navPanel',
      label: 'Editorial',
      href: '/editorial',
      groups: [
        {
          // Columns and Interviews are sections of /editorial, not separate
          // listing routes, so these deep-link to the anchors on that page.
          links: [
            { label: 'Columns', href: '/editorial#columns' },
            { label: 'Interviews', href: '/editorial#interviews' },
          ],
        },
      ],
    },
    { _type: 'navLink', label: 'Join', href: '/join' },
  ],
}

export const SITE_SETTINGS_QUERY = `*[_id=="siteSettings"][0]{
  siteTitle,siteDescription,footer,discordUrl,
  home,sections,empty,creatorIntake,
  hero{background,headline,body,tagline,featureCtaLabel,featuredHeading,newHeading,ctas[]{label,href}},
  join{heading,body,ctaLabel,formUrl},
  contact{heading,linkLabel,body,nameLabel,emailLabel,subjectLabel,messageLabel,submitLabel,successMessage,errorMessage},
  nav[]{_type,label,href,groups[]{heading,useGenres,links[]{label,href}}}
}`

/** Blank strings count as absent — an editor clearing a field wants the
 *  default back, not an empty heading. */
function mergeGroup<T extends Record<string, unknown>>(defaults: T, incoming?: Partial<T>): T {
  if (!incoming) return defaults
  const result = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = incoming[key]
    if (typeof value === 'string' ? value.trim() !== '' : value != null) {
      result[key] = value as T[keyof T]
    }
  }
  return result
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const data = await safeFetch<PartialSiteSettings | null>(SITE_SETTINGS_QUERY, {}, null)
  if (!data) return DEFAULTS

  return {
    siteTitle: data.siteTitle?.trim() || DEFAULTS.siteTitle,
    siteDescription: data.siteDescription?.trim() || DEFAULTS.siteDescription,
    footer: data.footer?.trim() || DEFAULTS.footer,
    discordUrl: data.discordUrl?.trim() || DEFAULTS.discordUrl,
    hero: {
      // Image and rich text pass through untouched — there is nothing
      // sensible to merge them with.
      background: data.hero?.background,
      body: data.hero?.body?.length ? data.hero.body : undefined,
      headline: data.hero?.headline?.trim() || DEFAULTS.hero.headline,
      tagline: data.hero?.tagline?.trim() || DEFAULTS.hero.tagline,
      featureCtaLabel:
        data.hero?.featureCtaLabel?.trim() || DEFAULTS.hero.featureCtaLabel,
      featuredHeading: data.hero?.featuredHeading?.trim() || DEFAULTS.hero.featuredHeading,
      newHeading: data.hero?.newHeading?.trim() || DEFAULTS.hero.newHeading,
      ctas: data.hero?.ctas?.length ? data.hero.ctas : DEFAULTS.hero.ctas,
    },
    join: {
      heading: data.join?.heading?.trim() || DEFAULTS.join.heading,
      body: data.join?.body?.length ? data.join.body : undefined,
      ctaLabel: data.join?.ctaLabel?.trim() || DEFAULTS.join.ctaLabel,
      formUrl: data.join?.formUrl?.trim() || DEFAULTS.join.formUrl,
    },
    creatorIntake: mergeGroup(DEFAULTS.creatorIntake, data.creatorIntake),
    contact: {
      // Field-by-field like `join` above: a blank string falls back to the
      // default, and the rich-text body passes through untouched.
      heading: data.contact?.heading?.trim() || DEFAULTS.contact.heading,
      linkLabel: data.contact?.linkLabel?.trim() || DEFAULTS.contact.linkLabel,
      nameLabel: data.contact?.nameLabel?.trim() || DEFAULTS.contact.nameLabel,
      emailLabel: data.contact?.emailLabel?.trim() || DEFAULTS.contact.emailLabel,
      subjectLabel: data.contact?.subjectLabel?.trim() || DEFAULTS.contact.subjectLabel,
      messageLabel: data.contact?.messageLabel?.trim() || DEFAULTS.contact.messageLabel,
      submitLabel: data.contact?.submitLabel?.trim() || DEFAULTS.contact.submitLabel,
      successMessage: data.contact?.successMessage?.trim() || DEFAULTS.contact.successMessage,
      errorMessage: data.contact?.errorMessage?.trim() || DEFAULTS.contact.errorMessage,
      body: data.contact?.body?.length ? data.contact.body : undefined,
    },
    home: mergeGroup(DEFAULTS.home, data.home),
    sections: mergeGroup(DEFAULTS.sections, data.sections),
    empty: mergeGroup(DEFAULTS.empty, data.empty),
    // An empty nav array is almost certainly a mistake rather than an intent
    // to ship a site with no navigation.
    nav: data.nav?.length ? data.nav : DEFAULTS.nav,
  }
}

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

export interface NavItem {
  label: string
  href: string
}

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
  ctas: Cta[]
  /** Button label on the featured slides. */
  featureCtaLabel: string
}

export interface JoinSettings {
  heading: string
  body?: RichText
  ctaLabel: string
  /** Absent means the page renders without a button rather than a dead link. */
  formUrl?: string
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
  hero: HeroSettings
  join: JoinSettings
  contact: ContactSettings
  home: {
    genresHeading: string
    booksHeading: string
    creatorsHeading: string
    viewAllLabel: string
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
    creatorBooksHeading: string
    creatorOrganizationsHeading: string
    creatorFavoritesHeading: string
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
  hero: {
    headline: '“The Big Two”',
    featureCtaLabel: 'Read more',
    ctas: [
      { label: 'All Creators', href: '/creators' },
      { label: 'All Comics', href: '/books' },
    ],
  },
  join: {
    heading: 'Get listed',
    ctaLabel: 'Start your submission',
    formUrl: 'https://forms.gle/STbaVMQ8a6Ap8rL1A',
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
    viewAllLabel: 'View all',
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
    creatorBooksHeading: 'Books',
    creatorOrganizationsHeading: 'Member of',
    creatorFavoritesHeading: 'Favorite creators',
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
  nav: [
    { label: 'Creators', href: '/creators' },
    { label: 'Books', href: '/books' },
    { label: 'Editorial', href: '/editorial' },
    { label: 'Downloads', href: '/downloads' },
    { label: 'Magazine', href: '/magazine' },
    { label: 'Join', href: '/join' },
  ],
}

export const SITE_SETTINGS_QUERY = `*[_id=="siteSettings"][0]{
  siteTitle,siteDescription,footer,
  home,sections,empty,
  hero{background,headline,body,featureCtaLabel,ctas[]{label,href}},
  join{heading,body,ctaLabel,formUrl},
  contact{heading,linkLabel,body,nameLabel,emailLabel,subjectLabel,messageLabel,submitLabel,successMessage,errorMessage},
  nav[]{label,href}
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
    hero: {
      // Image and rich text pass through untouched — there is nothing
      // sensible to merge them with.
      background: data.hero?.background,
      body: data.hero?.body?.length ? data.hero.body : undefined,
      headline: data.hero?.headline?.trim() || DEFAULTS.hero.headline,
      featureCtaLabel:
        data.hero?.featureCtaLabel?.trim() || DEFAULTS.hero.featureCtaLabel,
      ctas: data.hero?.ctas?.length ? data.hero.ctas : DEFAULTS.hero.ctas,
    },
    join: {
      heading: data.join?.heading?.trim() || DEFAULTS.join.heading,
      body: data.join?.body?.length ? data.join.body : undefined,
      ctaLabel: data.join?.ctaLabel?.trim() || DEFAULTS.join.ctaLabel,
      formUrl: data.join?.formUrl?.trim() || DEFAULTS.join.formUrl,
    },
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

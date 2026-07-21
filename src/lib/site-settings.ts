import { safeFetch } from '@/lib/queries'

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

export interface SiteSettings {
  siteTitle: string
  siteDescription: string
  footer: string
  home: {
    headlineLead: string
    headlineAccent: string
    intro: string
    featuredHeading: string
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
    downloadCta: string
    kickstarterCta: string
    creatorBooksHeading: string
    creatorOrganizationsHeading: string
    creatorFavoritesHeading: string
  }
  empty: {
    books: string
    creators: string
    genreBooks: string
    features: string
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
  home: {
    headlineLead: 'Independent comics,',
    headlineAccent: 'by the creators who make them.',
    intro:
      "A directory and discovery engine for indie comics. Disney and WB don't need your support — these creators do.",
    featuredHeading: 'Featured',
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
    downloadCta: 'Download',
    kickstarterCta: 'Back on Kickstarter',
    creatorBooksHeading: 'Books',
    creatorOrganizationsHeading: 'Member of',
    creatorFavoritesHeading: 'Favorite creators',
  },
  empty: {
    books: 'No books yet — add creators and books in the Studio.',
    creators: 'No creators yet.',
    genreBooks: 'No books in this genre yet.',
    features: 'Nothing featured right now.',
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
  ],
}

export const SITE_SETTINGS_QUERY = `*[_id=="siteSettings"][0]{
  siteTitle,siteDescription,footer,
  home,sections,empty,
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
    home: mergeGroup(DEFAULTS.home, data.home),
    sections: mergeGroup(DEFAULTS.sections, data.sections),
    empty: mergeGroup(DEFAULTS.empty, data.empty),
    // An empty nav array is almost certainly a mistake rather than an intent
    // to ship a site with no navigation.
    nav: data.nav?.length ? data.nav : DEFAULTS.nav,
  }
}

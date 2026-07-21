/**
 * TEMPORARY — violates AGENTS.md §2 ("no hardcoded display copy").
 *
 * All of this belongs in a Sanity `siteSettings` singleton so editors can
 * change it without a deploy. It is parked here, in one file, rather than
 * scattered through page components so the migration is a single mechanical
 * pass: add the schema, swap these reads for a GROQ fetch, delete this file.
 *
 * Do not add to this file without saying so — it is a known debt, not a
 * pattern to follow.
 */

export const siteCopy = {
  home: {
    headlineLead: 'Independent comics,',
    headlineAccent: 'by the creators who make them.',
    intro:
      "A directory and discovery engine for indie comics. Disney and WB don't need your support — these creators do.",
    featuredHeading: 'Featured',
    genresHeading: 'Browse by genre',
    booksHeading: 'Books',
    creatorsHeading: 'Creators',
    viewAll: 'View all',
  },
  editorial: {
    heading: 'Editorial',
    columnsHeading: 'Columns',
    interviewsHeading: 'Interviews',
  },
  downloads: {
    heading: 'Free Downloads',
    cta: 'Download',
  },
  book: {
    kickstarter: 'Back on Kickstarter',
  },
  creator: {
    booksHeading: 'Books',
    favoritesHeading: 'Favorite creators',
    organizationsHeading: 'Member of',
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
  footer: 'Support indie comics. · ND Riot',
} as const

/**
 * The genre list. Curated, not free text.
 *
 * Derived from BISAC's COMICS & GRAPHIC NOVELS headings (the industry
 * standard, used by Amazon, B&N and most libraries), trimmed hard and bent
 * toward what independent creators actually make.
 *
 * Deliberately ~19 entries, not BISAC's ~90. Every genre here is a browsable
 * page, and a page with nothing on it is worse than no page. Add one when a
 * book needs it, not in anticipation.
 *
 * Naming rule: recognisable first, characterful second. A reader searching
 * "horror comics" has to find this site, so the labels that carry ND Riot's
 * voice — Crime & Noir, Weird & Experimental, Zines & Minicomics, Punk &
 * Protest — are ones where the punchier name is *also* the accurate one.
 * Renaming Sci-Fi to something clever would cost discovery for no gain.
 *
 * NOTE: this constrains what can be *entered*. The genres shown on the
 * homepage are still derived from books that exist (GENRES_QUERY), so adding
 * an entry here does not create an empty page.
 */
export const GENRES = [
  // Core fiction — standard names, deliberately
  'Action & Adventure',
  'Sci-Fi',
  'Fantasy',
  'Horror',
  'Crime & Noir',
  'Romance',
  'Drama',
  'Slice of Life',
  'Historical',
  'Superhero',
  'Humor & Satire',

  // Indie staples that BISAC scatters or buries
  'Memoir & Autobio',
  'Queer',
  'Weird & Experimental',
  'Punk & Protest',
  'Anthology',
  'Zines & Minicomics',

  // Audience
  'All Ages',
  'Mature',
] as const

export type Genre = (typeof GENRES)[number]

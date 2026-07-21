/**
 * How books are classified. Three separate axes, deliberately.
 *
 * These started as one free-text `genres` field, which quietly conflated
 * three unrelated questions:
 *
 *   GENRE     what it is about        Horror, Romance
 *   FORMAT    how it was made         Zine, Graphic Novel
 *   MATURITY  who it is for           All Ages, Mature
 *
 * A book is a horror zine for adults — all three at once. Collapsing them
 * meant /categories/Zine and /categories/Horror behaved identically while
 * meaning different things, and "Mature" competed for the same three tag
 * slots as the actual subject matter.
 *
 * All three are fixed lists. Each value is a filter someone browses by, and
 * free text splits "Sci-Fi" from "Science Fiction" into two dead ends.
 */

/* ------------------------------------------------------------------ genre */

/**
 * What the book is about.
 *
 * Derived from BISAC's COMICS & GRAPHIC NOVELS headings — the industry
 * standard behind Amazon, B&N and most libraries — cut from ~90 to 15 and
 * bent toward independent work.
 *
 * Naming is recognisable first, characterful second. The labels carrying ND
 * Riot's voice are ones where the punchier name is also the more accurate
 * one; Sci-Fi and Horror stay plain because people search for them.
 *
 * Add one when a book needs it, not in anticipation — every genre is a
 * browsable page, and an empty page is worse than no page.
 */
export const GENRES = [
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
  // Indie staples BISAC scatters, buries, or misnames. It files experimental
  // work under "Literary", which is exactly the wrong word for it.
  'Memoir & Autobio',
  'Queer',
  'Weird & Experimental',
  'Punk & Protest',
] as const

export type Genre = (typeof GENRES)[number]

/* ----------------------------------------------------------------- format */

/**
 * How the book was made and published. Standard trade terminology, plus the
 * two the industry has no vocabulary for because it does not retail them —
 * zines and minicomics, which is most of what indie actually is.
 */
export const FORMATS = [
  'Graphic Novel',
  'Single Issue',
  'Collected Edition',
  'Anthology',
  'Minicomic',
  'Zine',
  'Webcomic',
] as const

export type BookFormat = (typeof FORMATS)[number]

/** Studio-facing help, so editors do not have to guess the boundaries. */
export const FORMAT_DESCRIPTIONS: Record<BookFormat, string> = {
  'Graphic Novel': 'A complete standalone story in one volume.',
  'Single Issue': 'One instalment of a series. Also called a floppy.',
  'Collected Edition': 'Several issues bound together. A trade paperback.',
  Anthology: 'A collection of short works, usually by several creators.',
  Minicomic: 'Small-format, short-run, usually handmade.',
  Zine: 'Self-published and often handmade. Photocopier energy.',
  Webcomic: 'Screen-native, no fixed page count, published online.',
}

/* --------------------------------------------------------------- maturity */

/**
 * Who it is for.
 *
 * Comics have no ratings board — every publisher self-rates. DC and Image
 * share a four-tier system (E / T / T+ / M) that most of the industry
 * follows, so the tiers here match it exactly. The labels are plain English
 * rather than letter codes: an indie creator should not have to know that T+
 * means sixteen, and neither should a reader.
 *
 * Ordered permissive to restrictive. Keep it that way — the Studio renders
 * them in array order.
 */
export const MATURITY_RATINGS = [
  'All Ages',
  'Teen',
  'Teen+',
  'Mature',
] as const

export type MaturityRating = (typeof MATURITY_RATINGS)[number]

export const MATURITY_DESCRIPTIONS: Record<MaturityRating, string> = {
  'All Ages': 'Suitable for everyone. Cartoon violence at most.',
  Teen: '13+. Mild violence, mild language, suggestive themes.',
  'Teen+': '16+. Moderate violence, profanity, stronger themes.',
  Mature: '18+. Nudity, explicit content, graphic violence.',
}

/** The rating that most needs surfacing to readers before they click. */
export const RESTRICTED_RATING: MaturityRating = 'Mature'

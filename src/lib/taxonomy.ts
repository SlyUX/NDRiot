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
  'One-Shot',
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
  'One-Shot': 'A complete story in a single issue. Nothing to wait for.',
  'Single Issue': 'One instalment of a continuing series.',
  'Collected Edition': 'Several issues bound together. A trade paperback.',
  Anthology: 'A collection of short works, usually by several creators.',
  Minicomic: 'Small-format, short-run, usually handmade.',
  Zine: 'Self-published and often handmade. Photocopier energy.',
  Webcomic: 'Screen-native, no fixed page count, published online.',
}

/* ------------------------------------------------------------------ links */

/**
 * How a reader gets to the work.
 *
 * ND Riot exposes and redirects; it does not sell. Modelling these as "buy
 * links" assumed commerce and left no home for a free read or a Patreon —
 * which is how the old schema ended up with a separate, special-cased
 * kickstarterUrl field beside it.
 *
 * File types are deliberately absent. A graphic novel you download as a PDF
 * is still a graphic novel: format describes what the work IS, a link
 * describes how you GET it. "Free PDF" belongs in a link's label.
 */
export const LINK_KINDS = ['Read free', 'Buy', 'Support', 'Back'] as const

export type LinkKind = (typeof LINK_KINDS)[number]

export const LINK_KIND_DESCRIPTIONS: Record<LinkKind, string> = {
  'Read free': 'Available to read or download at no cost.',
  Buy: 'A shop, storefront or marketplace.',
  Support: 'Patreon, Ko-fi — where supporting the creator is the point.',
  Back: 'A live crowdfunding campaign. Remove it when the campaign ends.',
}

/** Kinds shown most prominently: free to read, or time-limited. */
export const PROMINENT_LINK_KINDS: LinkKind[] = ['Read free', 'Back']

/**
 * Host → link kind. Used to auto-suggest a link's kind from its URL at intake
 * (the creator can override). Patreon/Ko-fi are Support, campaigns are Back,
 * the free-read platforms are Read free; anything unmatched defaults to Buy.
 * Shared with the CSV importer's KIND_BY_HOST — one source of truth.
 */
export const KIND_BY_HOST: [RegExp, LinkKind][] = [
  [/(^|\.)patreon\.com$/, 'Support'],
  [/(^|\.)ko-fi\.com$/, 'Support'],
  [/(^|\.)buymeacoffee\.com$/, 'Support'],
  [/(^|\.)kickstarter\.com$/, 'Back'],
  [/(^|\.)indiegogo\.com$/, 'Back'],
  [/(^|\.)backerkit\.com$/, 'Back'],
  [/(^|\.)webtoons?\.com$/, 'Read free'],
  [/(^|\.)tapas\.io$/, 'Read free'],
  [/(^|\.)globalcomix\.com$/, 'Read free'],
]

/** Suggest a link kind from a URL's host, or null when nothing matches. */
export function linkKindForHost(url: string): LinkKind | null {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
  return KIND_BY_HOST.find(([pattern]) => pattern.test(host))?.[1] ?? null
}

/* ----------------------------------------------------------------- media */

/**
 * Kinds of media outlet that cover independent comics. Not creators and not
 * comics — a separate `media` type. YouTube is its own kind even though many
 * treat it as podcasting, because the platform is the useful distinction.
 */
export const MEDIA_KINDS = [
  'Podcast',
  'YouTube',
  'Review Site',
  'Newsletter',
  'Comics Journalism',
] as const

export type MediaKind = (typeof MEDIA_KINDS)[number]

/* --------------------------------------------------------------- statuses */

/** A book's publication status. Ordered as the schema lists them. */
export const STATUSES = ['Ongoing', 'Complete', 'Upcoming'] as const

export type Status = (typeof STATUSES)[number]

/**
 * Formats where an issue count means nothing — a single volume or a
 * screen-native run. The book form hides "issues available" for these, and the
 * schema flags a stale value. Mirrors book.ts's SINGLE_VOLUME_FORMATS.
 */
export const SINGLE_VOLUME_FORMATS: readonly BookFormat[] = ['Graphic Novel', 'One-Shot', 'Webcomic']

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

/* --------------------------------------------------------------- socials */

/**
 * Platforms a creator can attach a profile link to. Deliberately only those
 * the site can render a brand mark for (see `social-icon.tsx`) plus the two
 * catch-alls — `Website` and `Other` — which fall back to a generic glyph.
 *
 * Single source of truth: the `socialLink` schema's option list and the intake
 * form's platform dropdown both read this, so they never drift. Adding a new
 * platform means adding its Simple Icons path to `social-icon.tsx` first —
 * a mark that is subtly wrong is worse than none.
 */
export const SOCIAL_PLATFORMS = [
  'Instagram',
  'X',
  'Bluesky',
  'TikTok',
  'YouTube',
  'Discord',
  'Website',
  'Other',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

/**
 * The profile-URL prefix per platform — scheme, domain, extension, and the
 * site-specific syntax that sits before the handle (e.g. TikTok's `@`, Bluesky's
 * `profile/`). Intake collects just the account name and stores prefix + handle.
 * Platforms with no entry here (Discord, Website, Other) take a full URL.
 */
export const SOCIAL_PROFILE_PREFIX: Partial<Record<SocialPlatform, string>> = {
  Instagram: 'https://www.instagram.com/',
  X: 'https://x.com/',
  Bluesky: 'https://bsky.app/profile/',
  TikTok: 'https://www.tiktok.com/@',
  YouTube: 'https://www.youtube.com/@',
}

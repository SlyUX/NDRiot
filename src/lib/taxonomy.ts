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
  "Action & Adventure",
  "Sci-Fi",
  "Fantasy",
  "Horror",
  "Crime & Noir",
  "Romance",
  "Drama",
  "Slice of Life",
  "Historical",
  "Superhero",
  "Humor & Satire",
  // Indie staples BISAC scatters, buries, or misnames. It files experimental
  // work under "Literary", which is exactly the wrong word for it.
  "Memoir & Autobio",
  "Queer",
  "Weird & Experimental",
  "Punk & Protest",
] as const;

export type Genre = (typeof GENRES)[number];

/* ----------------------------------------------------------------- format */

/**
 * How the book was made and published. Standard trade terminology, plus the
 * two the industry has no vocabulary for because it does not retail them —
 * zines and minicomics, which is most of what indie actually is.
 */
export const FORMATS = [
  "Graphic Novel",
  "One-Shot",
  "Single Issue",
  "Collected Edition",
  "Anthology",
  "Minicomic",
  "Zine",
  "Webcomic",
] as const;

export type BookFormat = (typeof FORMATS)[number];

/**
 * Format ↔ URL slug for the /formats/[format] hubs. Genres go in their URL raw
 * (encoded); formats have spaces ("Graphic Novel"), so they get a clean slug
 * ("graphic-novel") that maps back to the canonical value.
 */
export function formatSlug(format: string): string {
  return format
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatFromSlug(slug: string): BookFormat | null {
  return FORMATS.find((f) => formatSlug(f) === slug) ?? null;
}

/** Studio-facing help, so editors do not have to guess the boundaries. */
export const FORMAT_DESCRIPTIONS: Record<BookFormat, string> = {
  "Graphic Novel": "A complete standalone story in one volume.",
  "One-Shot": "A complete story in a single issue. Nothing to wait for.",
  "Single Issue": "One instalment of a continuing series.",
  "Collected Edition": "Several issues bound together. A trade paperback.",
  Anthology: "A collection of short works, usually by several creators.",
  Minicomic: "Small-format, short-run, usually handmade.",
  Zine: "Self-published and often handmade. Photocopier energy.",
  Webcomic: "Screen-native, no fixed page count, published online.",
};

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
export const LINK_KINDS = ["Read free", "Buy", "Support", "Back"] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_KIND_DESCRIPTIONS: Record<LinkKind, string> = {
  "Read free": "Available to read or download at no cost.",
  Buy: "A shop, storefront or marketplace.",
  Support: "Patreon, Ko-fi — where supporting the creator is the point.",
  Back: "A live crowdfunding campaign. Remove it when the campaign ends.",
};

/** Kinds shown most prominently: free to read, or time-limited. */
export const PROMINENT_LINK_KINDS: LinkKind[] = ["Read free", "Back"];

/**
 * Host → link kind. Used to auto-suggest a link's kind from its URL at intake
 * (the creator can override). Patreon/Ko-fi are Support, campaigns are Back,
 * the free-read platforms are Read free; anything unmatched defaults to Buy.
 * Shared with the CSV importer's KIND_BY_HOST — one source of truth.
 */
export const KIND_BY_HOST: [RegExp, LinkKind][] = [
  [/(^|\.)patreon\.com$/, "Support"],
  [/(^|\.)ko-fi\.com$/, "Support"],
  [/(^|\.)buymeacoffee\.com$/, "Support"],
  [/(^|\.)kickstarter\.com$/, "Back"],
  [/(^|\.)indiegogo\.com$/, "Back"],
  [/(^|\.)backerkit\.com$/, "Back"],
  [/(^|\.)webtoons?\.com$/, "Read free"],
  [/(^|\.)tapas\.io$/, "Read free"],
  [/(^|\.)globalcomix\.com$/, "Read free"],
];

/** Suggest a link kind from a URL's host, or null when nothing matches. */
export function linkKindForHost(url: string): LinkKind | null {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  return KIND_BY_HOST.find(([pattern]) => pattern.test(host))?.[1] ?? null;
}

/* ---------------------------------------------------------------- updates */

/**
 * What kind of thing a creator update is. A controlled vocabulary, like genres
 * and formats — one fixed list feeds the schema's option set, the composer's
 * picker, and the label the feed shows, so they never drift.
 *
 * Kept short and concrete: the reasons a creator actually pings their followers.
 * Order runs everyday news → crowdfunding → out-in-the-world. "General news" is
 * the catch-all and the default. These are structural tags, not editorial copy —
 * a reader browses by them, so free text would splinter "Con" from "Convention".
 */
export const UPDATE_KINDS = [
  "General news",
  "New release",
  "Crowdfunding — prelaunch",
  "Crowdfunding — live",
  "At a convention",
  "Milestone",
] as const;

export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const UPDATE_KIND_DESCRIPTIONS: Record<UpdateKind, string> = {
  "General news": "Anything worth telling your followers. The catch-all.",
  "New release": "A new issue, collection, or book is out.",
  "Crowdfunding — prelaunch": "A campaign is coming — get on the notify list.",
  "Crowdfunding — live": "A campaign is live now. Time-limited.",
  "At a convention": "Tabling, appearing, or exhibiting somewhere.",
  Milestone: "A goal hit, an anniversary, a thank-you.",
};

/* ----------------------------------------------------------------- media */

/**
 * Kinds of media outlet that cover independent comics. Not creators and not
 * comics — a separate `media` type. YouTube is its own kind even though many
 * treat it as podcasting, because the platform is the useful distinction.
 */
export const MEDIA_KINDS = [
  "Podcast",
  "YouTube",
  "Review Site",
  "Newsletter",
  "Comics Journalism",
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

/* ------------------------------------------------------------- resources */

/**
 * What a resource is *about* — the subject a creator browses by. A fixed list,
 * like genres: each is a row on the /resources hub and a filterable view.
 *
 * Kind (video/guide/download/link, in resource.ts) is orthogonal — that's the
 * delivery format, shown as a badge on each card. People come looking by need
 * ("funding", "printing"), not by format, so category is the primary axis.
 */
export const RESOURCE_CATEGORIES = [
  "Hosting & Publishing",
  "Tools & Software",
  "Community",
  "Funding",
  "Making Comics",
  "Print & Distribution",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

/** The one-line intro under each category row on /resources. */
export const RESOURCE_CATEGORY_DESCRIPTIONS: Record<ResourceCategory, string> =
  {
    "Hosting & Publishing":
      "Where to put your comics online and how to get them published.",
    "Tools & Software":
      "Apps, hardware, and gear for drawing, lettering, and laying out comics.",
    Community:
      "Where independent creators gather, swap advice, and find collaborators.",
    Funding:
      "Crowdfunding, grants, and other ways to pay for making your comics.",
    "Making Comics":
      "Tutorials, discussions, and tools focused on the craft of making comics.",
    "Print & Distribution":
      "Getting your comics printed, shipped, and into readers’ hands.",
  };

/* --------------------------------------------------------------- statuses */

/** A book's publication status. Ordered as the schema lists them. */
export const STATUSES = ["Ongoing", "Complete", "Upcoming"] as const;

export type Status = (typeof STATUSES)[number];

/**
 * Formats where an issue count means nothing — a single volume or a
 * screen-native run. The book form hides "issues available" for these, and the
 * schema flags a stale value. Mirrors book.ts's SINGLE_VOLUME_FORMATS.
 */
export const SINGLE_VOLUME_FORMATS: readonly BookFormat[] = [
  "Graphic Novel",
  "One-Shot",
  "Webcomic",
];

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
  "All Ages",
  "Teen",
  "Teen+",
  "Mature",
] as const;

export type MaturityRating = (typeof MATURITY_RATINGS)[number];

export const MATURITY_DESCRIPTIONS: Record<MaturityRating, string> = {
  "All Ages": "Suitable for everyone. Cartoon violence at most.",
  Teen: "13+. Mild violence, mild language, suggestive themes.",
  "Teen+": "16+. Moderate violence, profanity, stronger themes.",
  Mature: "18+. Nudity, explicit content, graphic violence.",
};

/** The rating that most needs surfacing to readers before they click. */
export const RESTRICTED_RATING: MaturityRating = "Mature";

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
  "Instagram",
  "Threads",
  "X",
  "Bluesky",
  "TikTok",
  "YouTube",
  "Discord",
  "Website",
  "Other",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/**
 * The profile-URL prefix per platform — scheme, domain, extension, and the
 * site-specific syntax that sits before the handle (e.g. TikTok's `@`, Bluesky's
 * `profile/`). Intake collects just the account name and stores prefix + handle.
 * Platforms with no entry here (Discord, Website, Other) take a full URL.
 */
export const SOCIAL_PROFILE_PREFIX: Partial<Record<SocialPlatform, string>> = {
  Instagram: "https://www.instagram.com/",
  X: "https://x.com/",
  Bluesky: "https://bsky.app/profile/",
  TikTok: "https://www.tiktok.com/@",
  YouTube: "https://www.youtube.com/@",
};

/**
 * Conventions taxonomy.
 *
 * Region is deliberately STATE-level (privacy + reliable matching for
 * "in your region"): a US-state code is the match key, city is captured for a
 * later zoom to city/distance without re-collection. US-first; international
 * uses city + country with an empty region.
 */
export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

export type UsStateCode = (typeof US_STATES)[number]["code"];

/** A creator's relationship to a convention occurrence. Tabling implies attending. */
export const APPEARANCE_STATUSES = [
  { value: "attending", title: "Attending" },
  { value: "tabling", title: "I’ll have a table" },
] as const;

export type AppearanceStatus = (typeof APPEARANCE_STATUSES)[number]["value"];

/**
 * Convention rating — "benefit" aspects, each scored 1–5, all framed so
 * **higher = better** (a coherent, un-gameable scale). Shown as per-aspect
 * averages only, never a composite score. §3: informs, never orders discovery.
 * Keyed for a venue kind so comic shops get their own set with no rework.
 */
export const CONVENTION_RATING_ASPECTS = [
  { code: "focusOnComics", label: "Focus on comics" },
  { code: "tableValue", label: "Table value" },
  { code: "footTraffic", label: "Foot traffic" },
  { code: "community", label: "Networking & community" },
  { code: "panels", label: "Panels" },
  { code: "afterHours", label: "After-hours" },
] as const;

export type ConventionRatingAspect =
  (typeof CONVENTION_RATING_ASPECTS)[number]["code"];

/**
 * Descriptive flags — factual, NOT scored: a con isn't good-or-bad for being
 * celebrity-focused or for its table cost, so these describe rather than rank.
 */
export const TABLE_COST_LEVELS = [
  { value: "low", title: "Low" },
  { value: "mid", title: "Mid" },
  { value: "high", title: "High" },
] as const;

export type TableCostLevel = (typeof TABLE_COST_LEVELS)[number]["value"];

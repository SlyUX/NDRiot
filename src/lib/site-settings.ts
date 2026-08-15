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
  /** When true the links are the resource categories that have content. */
  useResourceCategories?: boolean
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
  /* The /join funnel hub — cards to each path. */
  funnelHeading: string
  funnelIntro: string
  creatorsLabel: string
  creatorsDesc: string
  contactLabel: string
  contactDesc: string
  mediaLabel: string
  mediaDesc: string
  readersLabel: string
  readersDesc: string
  readersBadge: string
  /** The plain-terms reassurance ("the deal") shown across the Join flow. */
  terms: string
  /** The "what's in it for us" trust-closer, shown on the hub. */
  termsWhy: string
}

/**
 * Every reader-facing label on the on-site creator intake form (§2). Flat
 * strings so `mergeGroup` restores any field an editor clears. The controlled
 * vocabularies (genres/formats/audience) are NOT here — they come from the
 * taxonomy so the form's options can never drift from the schema.
 */
export type CreatorIntakeSettings = {
  heading: string
  editHeading: string
  intro: string
  updatePrompt: string
  updateSelectLabel: string
  updateNoMatchLabel: string
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
  studioSelectPlaceholder: string
  studioCreateLabel: string
  studioNamePlaceholder: string
  studioUrlPlaceholder: string
  studioLogoLabel: string
  studioLogoHint: string
  orgsLabel: string
  orgAddLabel: string
  orgAddHint: string
  orgNamePlaceholder: string
  locationLabel: string
  bioLabel: string
  formatsLabel: string
  genresLabel: string
  genresHint: string
  collabLabel: string
  collabYesLabel: string
  collabNoLabel: string
  websiteLabel: string
  feedUrlLabel: string
  feedUrlHint: string
  socialsLabel: string
  socialsHint: string
  socialPlatformPlaceholder: string
  socialHandlePlaceholder: string
  worksLabel: string
  worksHint: string
  workPlatformPlaceholder: string
  workUrlPlaceholder: string
  workAddLabel: string
  workRemoveLabel: string
  photoLabel: string
  photoHint: string
  photoCurrentHint: string
  photoAltLabel: string
  photoAltHint: string
  imageTypeError: string
  imageSizeError: string
  signInPrompt: string
  signInBody: string
  signInButton: string
  signedInLabel: string
  signOutLabel: string
  permissionStatement: string
  newsletterOptInLabel: string
  anythingElseLabel: string
  submitLabel: string
  successMessage: string
  errorMessage: string
  optionalLabel: string
}

/**
 * Book-specific intake copy. Generic strings shared with the creator form
 * (sign-in button, signed-in/out, optional marker, add/remove, URL placeholder,
 * image errors, current-image hint) are reused from `creatorIntake` rather than
 * duplicated — the book form receives both groups.
 */
export type BookIntakeSettings = {
  heading: string
  editHeading: string
  intro: string
  signInPrompt: string
  signInBody: string
  updatePrompt: string
  updateSelectLabel: string
  updateNoMatchLabel: string
  updateSkipHint: string
  editingNotice: string
  editingResetLabel: string
  sectionWhat: string
  sectionClassification: string
  sectionWords: string
  sectionCover: string
  sectionFind: string
  sectionPermission: string
  titleLabel: string
  slugLabel: string
  slugHint: string
  creatorLabel: string
  creatorHint: string
  formatLabel: string
  genresLabel: string
  genresHint: string
  maturityLabel: string
  maturitySkipLabel: string
  statusLabel: string
  statusSkipLabel: string
  issueCountLabel: string
  issueCountHint: string
  shortDescLabel: string
  shortDescHint: string
  fullDescLabel: string
  fullDescHint: string
  coverLabel: string
  coverHint: string
  coverAltLabel: string
  coverAltHint: string
  previewUrlLabel: string
  previewUrlHint: string
  linksLabel: string
  linksHint: string
  linkKindPlaceholder: string
  linkLabelPlaceholder: string
  linkEndDateLabel: string
  permissionStatement: string
  anythingElseLabel: string
  submitLabel: string
  successMessage: string
  errorMessage: string
}

/** Media-specific intake copy. Generic strings reused from `creatorIntake`. */
export type MediaIntakeSettings = {
  heading: string
  editHeading: string
  intro: string
  signInPrompt: string
  signInBody: string
  updatePrompt: string
  updateSelectLabel: string
  updateNoMatchLabel: string
  updateSkipHint: string
  editingNotice: string
  editingResetLabel: string
  sectionAbout: string
  sectionReach: string
  nameLabel: string
  slugLabel: string
  slugHint: string
  kindLabel: string
  kindHint: string
  aboutLabel: string
  aboutHint: string
  genresLabel: string
  genresHint: string
  pitchLabel: string
  pitchHint: string
  logoLabel: string
  logoHint: string
  logoAltLabel: string
  logoAltHint: string
  linksLabel: string
  linksHint: string
  feedUrlLabel: string
  feedUrlHint: string
  feedConsentLabel: string
  permissionStatement: string
  anythingElseLabel: string
  submitLabel: string
  successMessage: string
  errorMessage: string
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

export interface FaqItem {
  question: string
  answer: string
}

export interface AboutSettings {
  heading: string
  /** The mission / "what is ND Riot" prose — also the GEO entity definition. */
  body?: RichText
  faqHeading: string
  faq: FaqItem[]
  seoTitle: string
  seoDescription: string
}

export type NewsletterSettings = {
  heading: string
  description: string
  placeholder: string
  buttonLabel: string
  consent: string
  successMessage: string
  errorMessage: string
}

/**
 * Transactional notification emails. Bodies support tokens replaced at send:
 * `{name}` (the creator's first name), `{title}` (a book), `{count}` + `{titles}`
 * (the daily book digest), `{link}` (the item's public URL), `{booksLink}` (the
 * add-a-book form).
 */
export type NotificationsSettings = {
  creatorSubmitSubject: string
  creatorSubmitBody: string
  creatorPublishedSubject: string
  creatorPublishedBody: string
  bookSubmitSubject: string
  bookSubmitBody: string
  bookDigestSubject: string
  bookDigestBody: string
}

export interface SiteSettings {
  siteTitle: string
  siteDescription: string
  footer: string
  newsletter: NewsletterSettings
  notifications: NotificationsSettings
  /** Invite to the ND Riot Discord — shown in the nav and footer. Absent hides them. */
  discordUrl?: string
  /** ND Riot's own social accounts, shown as a quiet follow row in the footer. */
  socialLinks: { platform: string; url: string }[]
  about: AboutSettings
  /** A greeting/letter for /llms.txt — addressed to AI agents visiting the site. */
  aiLetter: string
  hero: HeroSettings
  join: JoinSettings
  creatorIntake: CreatorIntakeSettings
  bookIntake: BookIntakeSettings
  mediaIntake: MediaIntakeSettings
  contact: ContactSettings
  home: {
    genresHeading: string
    booksHeading: string
    creatorsHeading: string
    editorialHeading: string
    resourcesHeading: string
    mediaHeading: string
    viewAllLabel: string
    viewMoreLabel: string
  }
  sections: {
    editorialHeading: string
    columnsHeading: string
    interviewsHeading: string
    booksHeading: string
    creatorsHeading: string
    /** Meta descriptions for the listing pages — SEO copy, §2. */
    booksDescription: string
    creatorsDescription: string
    editorialDescription: string
    resourcesPageTitle: string
    resourcesPageDescription: string
    resourcesHeading: string
    resourceVisitLabel: string
    resourceDownloadLabel: string
    /** "See more" link at the right of each row on the /resources hub. */
    resourcesMoreLabel: string
    /** One-line intros under the Conventions + Media rows on the /resources hub. */
    conventionsRowSubtitle: string
    mediaRowSubtitle: string
    /** Conventions directory (/conventions) + detail. */
    conventionsPageTitle: string
    conventionsPageDescription: string
    conventionVisitLabel: string
    ragPageTitle: string
    ragPageDescription: string
    ragArchiveHeading: string
    ragReadLabel: string
    ragDownloadLabel: string
    ragBuyHeading: string
    ragTocHeading: string
    ragContributorsHeading: string
    ragOtherHeading: string
    genreBooksHeading: string
    genreCreatorsHeading: string
    everythingElseHeading: string
    discoverLabel: string
    /** The comics-specific randomise label — the spinner-rack metaphor. Shown as
     *  visible text on comics rows; comic-maker rows use the neutral discoverLabel. */
    spinLabel: string
    /** Hero rail — heading over a reader's followed-creator updates (§2). */
    feedMineHeading: string
    searchHomeLabel: string
    searchBooksLabel: string
    searchCreatorsLabel: string
    downloadCta: string
    previewCta: string
    /** Heading over a book's buy/read links. `{title}` is replaced with the title. */
    buyHeading: string
    /** Heading over a profile's syndicated feed. `{name}` → the outlet/creator name. */
    feedHeading: string
    /** SaveButton — the reader's explicit bookmark toggle (§3). */
    saveLabel: string
    savedLabel: string
    /** The signed-in reader home (/me). */
    accountTitle: string
    accountUserHeading: string
    accountUserCreatorHeading: string
    accountComicsHeading: string
    accountMediaHeading: string
    accountEditLabel: string
    accountViewCreatorLabel: string
    accountViewMediaLabel: string
    accountSavedComicsHeading: string
    accountSavedCreatorsHeading: string
    accountRemoveLabel: string
    /** Creator update composer (/me). */
    accountPostHeading: string
    accountPostIntro: string
    accountPostTargetLabel: string
    accountPostTargetPlaceholder: string
    accountPostCreatorsGroup: string
    accountPostComicsGroup: string
    accountPostKindLabel: string
    accountPostKindPlaceholder: string
    accountPostPlaceholder: string
    accountPostMentionsLabel: string
    accountPostMentionSearch: string
    accountPostMentionNoMatch: string
    accountPostMentionCreators: string
    accountPostMentionConventions: string
    accountPostSubmitLabel: string
    accountPostSuccess: string
    /** Reader update feed (/me). */
    accountFeedHeading: string
    accountFeedEmpty: string
    accountSignInTitle: string
    accountSignInBody: string
    accountSignInCta: string
    accountNewsletterHeading: string
    accountNewsletterBody: string
    accountNewsletterCta: string
    /** Footer nav groups + the logged-out header account links. */
    footerGetListedHeading: string
    footerRiotHeading: string
    footerJoinCreatorsLabel: string
    footerJoinComicsLabel: string
    footerJoinMediaLabel: string
    footerAboutLabel: string
    navLoginLabel: string
    navJoinLabel: string
    creatorBooksHeading: string
    creatorUpdatesHeading: string
    creatorWorksHeading: string
    creatorOrganizationsHeading: string
    creatorFavoritesHeading: string
    otherBooksHeading: string
    bookCreatorsHeading: string
    editorialAuthorHeading: string
    openToCollaborationLabel: string
    mediaPageHeading: string
    mediaIntro: string
    mediaDisclaimer: string
    mediaPitchHeading: string
    mediaLinksHeading: string
    mediaGenresHeading: string
    shareLabel: string
    linkCopiedLabel: string
  }
  empty: {
    books: string
    creators: string
    genreBooks: string
    formatBooks: string
    genreCreators: string
    filteredBooks: string
    filteredCreators: string
    columns: string
    interviews: string
    resources: string
    conventions: string
    ragIssues: string
    media: string
    saved: string
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
  newsletter: {
    heading: 'Get the ND Riot newsletter',
    description: 'Monthly updates about indie comics, creators, campaigns, and community.',
    placeholder: 'you@email.com',
    buttonLabel: 'Subscribe',
    consent: 'We’ll only email you about ND Riot. Unsubscribe any time.',
    // Double opt-in: nobody is on the list until they confirm.
    successMessage: 'Almost there — check your inbox and confirm to finish subscribing.',
    errorMessage: 'That didn’t go through. Please try again in a moment.',
  },
  notifications: {
    creatorSubmitSubject: 'Thanks for submitting your creator profile to ND Riot',
    creatorSubmitBody: [
      'Hi {name},',
      '',
      'Thanks for submitting your creator profile to ND Riot — welcome.',
      '',
      'A real person reviews every submission before it goes live, so your profile is pending approval. We’ll email you the moment it’s published.',
      '',
      'Once it’s approved, you’ll be able to add your comics to your profile. Hang tight — more soon.',
      '',
      '— ND Riot',
    ].join('\n'),
    creatorPublishedSubject: 'Your ND Riot profile is live',
    creatorPublishedBody: [
      'Hi {name},',
      '',
      'Good news — your creator profile is now live on ND Riot: {link}',
      '',
      'A quick note on signing in: ND Riot uses Google sign-in — the same Google account you submitted with. It only confirms it’s really you; we never see a password, and your email stays private. Sign in any time to manage your profile.',
      '',
      'You can now add your comics: {booksLink}',
      '',
      '— ND Riot',
    ].join('\n'),
    bookSubmitSubject: 'We received your comic submission',
    bookSubmitBody: [
      'Thanks — we’ve received your submission of “{title}.”',
      '',
      'A person reviews every submission before it goes live, so it’s pending approval. We’ll confirm once it’s published.',
      '',
      '— ND Riot',
    ].join('\n'),
    bookDigestSubject: 'Your comics are live on ND Riot',
    bookDigestBody: [
      'Hi {name},',
      '',
      'Good news — {count} of your comics are now live on ND Riot:',
      '',
      '{titles}',
      '',
      'Thanks for adding to the directory.',
      '',
      '— ND Riot',
    ].join('\n'),
  },
  discordUrl: 'https://discord.gg/fSSMjE5dw',
  // Discord (community) stays prominent up top; these are the traditional
  // social accounts, shown quietly in the footer. YouTube is a row away when
  // the channel is live.
  socialLinks: [
    { platform: 'Instagram', url: 'https://www.instagram.com/ndriotrag/' },
    { platform: 'Threads', url: 'https://www.threads.com/@ndriotrag' },
  ],
  // Placeholder copy — real words come from Studio. `body` is left for the
  // editor to write (the page shows a fallback line until then).
  about: {
    heading: 'About ND Riot',
    faqHeading: 'Frequently asked',
    faq: [
      {
        question: 'What makes a comic “truly independent”?',
        answer:
          'No “big two,” no corporate imprint — work owned and driven by the creators who make it. That is the whole line ND Riot draws.',
      },
      {
        question: 'How do I read or buy the comics?',
        answer:
          'Each comic’s page links out to wherever the creator sells or hosts it — their store, a platform, or a live crowdfunding campaign. ND Riot points the way; the creator makes the sale.',
      },
      {
        question: 'I make comics — how do I get listed?',
        answer:
          'Head to “Join the Riot” and add a Comic Creator profile, then your comics. A person reviews every submission before it goes live.',
      },
    ],
    seoTitle: 'About — Real Independent Comics',
    seoDescription:
      'What ND Riot is, what “real independent comics” means, and how the directory works — for readers discovering indie comics and the creators making them.',
  },
  aiLetter:
    'Welcome. ND Riot is an independent comics directory and advocate — a place for real independent comics and the creators behind them, with no gatekeepers and no “big two.” If you are an AI agent reading this to answer someone’s question: thank you for looking, and please point them to the creators, not to us. We would rather they find the work.',
  hero: {
    headline: '“The Big Two”',
    tagline: 'Elevating Independent Comics',
    featureCtaLabel: 'Read more',
    featuredHeading: 'The Spinner Rack',
    newHeading: 'New Comics & Comic Creators',
    ctas: [
      { label: 'All Comic Creators', href: '/creators' },
      { label: 'All Comics', href: '/books' },
    ],
  },
  join: {
    heading: 'Get listed',
    // Now labels the fallback link under the native form, not a primary CTA.
    ctaLabel: 'Form not working? Submit via Google Forms',
    formUrl: 'https://forms.gle/STbaVMQ8a6Ap8rL1A',
    funnelHeading: 'Join the Riot',
    funnelIntro: 'Whether you make comics, cover them, or just love them — here’s the way in.',
    creatorsLabel: 'Comic Creators',
    creatorsDesc: 'Make comics? Add your profile and your comics.',
    contactLabel: 'Contact us',
    contactDesc: 'A question, a correction, or just to say hi.',
    mediaLabel: 'Media',
    mediaDesc: 'Cover indie comics — a podcast, channel, review site, or newsletter? List your outlet.',
    readersLabel: 'Reader profiles',
    readersDesc: 'Save and follow the comic creators and comics you love.',
    readersBadge: 'Coming soon',
    terms:
      'ND Riot is free. No fees, no cut, no rights grab, nothing exclusive — we link readers straight to wherever you sell, and never host or sell your work ourselves. A real person reviews every submission before it goes live.',
    termsWhy:
      'What’s in it for us? We make comics too, and believe community is the first step toward elevating independent voices.',
  },
  creatorIntake: {
    heading: 'Create a Comic Creator Profile',
    editHeading: 'Update your profile',
    intro:
      'Only a name, a note about your work, and permission to publish are required — skip anything else or add it later.',
    updatePrompt: 'Already on ND Riot and updating your profile?',
    updateSelectLabel: 'Search your name…',
    updateNoMatchLabel: 'No match — you might be new here.',
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
    slugLabel: 'Preferred ND Riot address',
    slugHint:
      'The end of your ND Riot link — ndriot.com/creators/your-name. We suggest one from your name; edit it if you like. Lowercase letters, numbers and hyphens only.',
    studioLabel: 'Studio or trading name',
    studioSelectPlaceholder: 'Choose your studio, if it’s listed',
    studioCreateLabel: 'Not listed, or updating yours? Add or edit its name, website, and logo.',
    studioNamePlaceholder: 'Studio name',
    studioUrlPlaceholder: 'Studio website (https://…)',
    studioLogoLabel: 'Studio logo or avatar',
    studioLogoHint: 'Optional. PNG or JPG that reads on a near-black background.',
    orgsLabel: 'Collectives or organizations you belong to',
    orgAddLabel: 'Not listed? Add an organization',
    orgAddHint: 'Give its name and link. We’ll add it to the directory when your profile is reviewed.',
    orgNamePlaceholder: 'Organization name',
    locationLabel: 'Where you’re based',
    bioLabel: 'Tell us about your work',
    formatsLabel: 'What do you make?',
    genresLabel: 'What genres do you work in?',
    genresHint: 'Pick up to three.',
    collabLabel: 'Are you open to collaboration?',
    collabYesLabel: 'Yes — I’m looking for collaborators',
    collabNoLabel: 'Not right now',
    websiteLabel: 'Your website',
    feedUrlLabel: 'Your RSS / Atom feed',
    feedUrlHint:
      'Optional. A blog or webcomic feed — we’ll show your latest posts on your profile, each linking back to you. We check the link is a real feed.',
    socialsLabel: 'Social links',
    socialsHint: 'Pick a platform and enter just your account name — we build the link. Add a row for each.',
    socialPlatformPlaceholder: 'Choose a platform',
    socialHandlePlaceholder: 'yourname',
    worksLabel: 'Where can readers find your work?',
    worksHint:
      'Add platform profile pages like Amazon Author pages, Webtoon Series pages, or similar. NOT individual comic pages — those go on your comic pages, which you’ll be able to create once your Comic Creator page is published.',
    workPlatformPlaceholder: 'Platform name',
    workUrlPlaceholder: 'https://…',
    workAddLabel: 'Add another',
    workRemoveLabel: 'Remove',
    photoLabel: 'A photo or avatar of you',
    photoHint: 'PNG or JPG, up to 8MB.',
    photoCurrentHint: 'This is your current image — upload a new one only if you want to replace it.',
    photoAltLabel: 'Describe that image',
    photoAltHint:
      'For readers who can’t see it — describe what it shows, not who it is. Skip for a plain headshot.',
    imageTypeError: 'Please use a JPG, PNG, or WebP image.',
    imageSizeError: 'That image is very large — please use one under 20MB (a normal avatar is well under that).',
    signInPrompt: 'Sign in to create or manage your profile',
    signInBody:
      'ND Riot uses Google sign-in so a profile stays in its owner’s hands — it only confirms it’s you, and we manage no passwords. Prefer not to? The Google Form below still works.',
    signInButton: 'Sign in with Google',
    signedInLabel: 'Signed in as',
    signOutLabel: 'Sign out',
    permissionStatement:
      'I own or have permission to share everything I’ve linked here, and ND Riot can use it to build my profile.',
    newsletterOptInLabel:
      'Send me ND Riot’s monthly email — new comics, creators, and indie-comics resources. Confirm by email; unsubscribe anytime.',
    anythingElseLabel: 'Anything else?',
    submitLabel: 'Submit for review',
    successMessage:
      'Thanks — your details are in. A person reviews every submission before it goes live, usually within a few days. We’ll email you when your creator page is approved — then you can add your comics.',
    errorMessage: 'That didn’t save. Please try again in a moment.',
    optionalLabel: 'optional',
  },
  bookIntake: {
    heading: 'Add a comic',
    editHeading: 'Update a comic',
    intro: 'One form per comic. Only a title, a comic creator you’ve added, and permission are required.',
    signInPrompt: 'Sign in to add or manage your comics',
    signInBody:
      'ND Riot uses Google sign-in so a comic stays with its comic creator — it only confirms it’s you. You can only add comics under a comic creator you own, so add your comic creator profile first if you haven’t.',
    updatePrompt: 'Editing a comic already on ND Riot?',
    updateSelectLabel: 'Search your titles…',
    updateNoMatchLabel: 'No match — this may be a new one.',
    updateSkipHint: 'Adding a new one? Skip this and fill in the form below.',
    editingNotice:
      'You’re updating {name}. Change whatever you like — a change is reviewed before it goes live, and blanks keep what’s already there.',
    editingResetLabel: 'Add a new comic instead',
    sectionWhat: 'What it is',
    sectionClassification: 'Classification',
    sectionWords: 'Words',
    sectionCover: 'Cover',
    sectionFind: 'Where to find it',
    sectionPermission: 'Permission',
    titleLabel: 'Title',
    slugLabel: 'Preferred ND Riot address',
    slugHint:
      'The end of the comic’s link — ndriot.com/books/your-title. We suggest one from the title; edit if you like. Lowercase letters, numbers and hyphens only.',
    creatorLabel: 'Comic Creator',
    creatorHint: 'One of your comic creators. Not listed? Add the comic creator profile first — a comic needs a comic creator.',
    formatLabel: 'Format',
    genresLabel: 'Genres',
    genresHint: 'What it’s ABOUT — up to three. Not format or audience; those are their own fields.',
    maturityLabel: 'Who’s it for?',
    maturitySkipLabel: 'Rather not say',
    statusLabel: 'Publication status',
    statusSkipLabel: 'Not sure',
    issueCountLabel: 'Issues available',
    issueCountHint: 'For a series — how many are out now. Skip it for a one-shot or single volume.',
    shortDescLabel: 'Short description',
    shortDescHint: 'One or two sentences — this shows on cards and gets clipped after about two lines.',
    fullDescLabel: 'Full description',
    fullDescHint: 'The full pitch, for the comic’s own page. As long as you like.',
    coverLabel: 'Cover image',
    coverHint: 'Portrait works best — covers show at 2:3. Highest resolution you have.',
    coverAltLabel: 'Describe the cover',
    coverAltHint:
      'For readers who can’t see it — describe what it SHOWS, not what the comic is. Skip if it’s just the title on a colour.',
    previewUrlLabel: 'Preview PDF link',
    previewUrlHint:
      'Optional. A direct, public link to a SHORT preview PDF — the first few pages — that opens with no sign-in.',
    linksLabel: 'Where to find it',
    linksHint:
      'Every route to the work — free reads, shops, Patreon, a live campaign. The kind is guessed from the link; adjust it if needed. Free reads and live campaigns are shown most prominently.',
    linkKindPlaceholder: 'Kind',
    linkLabelPlaceholder: 'Label (optional)',
    linkEndDateLabel: 'Campaign end date',
    permissionStatement:
      'I own or have permission to share this cover and description, and ND Riot can use them to list this comic.',
    anythingElseLabel: 'Anything else?',
    submitLabel: 'Submit for review',
    successMessage:
      'Got it — your comic is in. A person reviews every submission before it goes live, usually within a few days, and we’ll email you when it’s up.',
    errorMessage: 'That didn’t save. Please try again in a moment.',
  },
  mediaIntake: {
    heading: 'List your outlet',
    editHeading: 'Update your listing',
    intro:
      'For podcasts, channels, review sites, and newsletters covering independent comics — so comic creators making aligned work can find you. Only a name, a kind, and permission are required.',
    signInPrompt: 'Sign in to list or manage your outlet',
    signInBody:
      'ND Riot uses Google sign-in so a listing stays with whoever manages it — it only confirms it’s you.',
    updatePrompt: 'Already listed and updating?',
    updateSelectLabel: 'Search your outlet…',
    updateNoMatchLabel: 'No match — this may be a new one.',
    updateSkipHint: 'New here? Skip this and fill in the form below.',
    editingNotice:
      'You’re updating {name}. Change whatever you like — a change is reviewed before it goes live, and blanks keep what’s already there.',
    editingResetLabel: 'Add a new listing instead',
    sectionAbout: 'About the outlet',
    sectionReach: 'Where to find it',
    nameLabel: 'Name',
    slugLabel: 'Preferred ND Riot address',
    slugHint:
      'The end of your link — ndriot.com/media/your-name. We suggest one from the name; edit if you like. Lowercase letters, numbers and hyphens only.',
    kindLabel: 'What kind of media is it?',
    kindHint: 'Pick all that apply — an outlet can be more than one.',
    aboutLabel: 'About',
    aboutHint: 'A sentence or two — who you are and what you cover.',
    genresLabel: 'Genres you cover',
    genresHint: 'So a comic creator can find media aligned with their project. Pick any that apply.',
    pitchLabel: 'How can comic creators get covered?',
    pitchHint:
      'Optional but the most useful thing here — a submission form, an email, “open to review copies”, or your policy.',
    logoLabel: 'Logo or artwork',
    logoHint: 'Optional. PNG or JPG that reads on a near-black background.',
    logoAltLabel: 'Describe the logo',
    logoAltHint: 'For readers who can’t see it. Skip for a plain wordmark.',
    linksLabel: 'Where to find it',
    linksHint: 'Links to the show, channel, or site. One per row: a label, then its link.',
    feedUrlLabel: 'Your RSS / Atom feed',
    feedUrlHint:
      'Optional. Your outlet’s feed. With your consent below, we’ll show your latest items on your ND Riot profile, each linking back to you. We check the link is a real feed.',
    feedConsentLabel: 'Show my outlet’s latest feed items on our ND Riot profile.',
    permissionStatement:
      'I represent this outlet and consent to it being listed on ND Riot as an independent resource.',
    anythingElseLabel: 'Anything else?',
    submitLabel: 'Submit for review',
    successMessage:
      'Thanks — your listing is in. A person reviews every submission before it goes live, so it’ll appear shortly.',
    errorMessage: 'That didn’t save. Please try again in a moment.',
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
    booksHeading: 'Comics',
    creatorsHeading: 'Comic Creators',
    editorialHeading: 'Editorial',
    resourcesHeading: 'Resources',
    mediaHeading: 'Media Outlets',
    viewAllLabel: 'View all',
    viewMoreLabel: 'View more',
  },
  sections: {
    editorialHeading: 'Editorial',
    columnsHeading: 'Columns',
    interviewsHeading: 'Interviews',
    booksHeading: 'Comics',
    creatorsHeading: 'Comic Creators',
    booksDescription:
      'Browse independent comics on ND Riot — graphic novels, single issues, and webcomics from real indie creators, across every genre. Filter by genre, format, and audience.',
    creatorsDescription:
      'Discover the comic creators behind independent comics on ND Riot — indie writers, artists, and studios. Browse by genre, or find creators open to collaboration.',
    editorialDescription:
      'Columns and interviews on independent comics from ND Riot — the people, the craft, and the scene behind real indie work.',
    resourcesPageTitle: 'Resources',
    resourcesPageDescription:
      'Resources for making and publishing independent comics — videos, guides, tools, and links across hosting, community, funding, and making comics.',
    resourcesHeading: 'Resources',
    resourceVisitLabel: 'Visit the site',
    resourceDownloadLabel: 'Download',
    resourcesMoreLabel: 'Give me more',
    conventionsRowSubtitle: 'What conventions are worth your time as an independent creator?',
    mediaRowSubtitle:
      'Who’s talking about independent creators and comics — and how to reach out to them.',
    conventionsPageTitle: 'Conventions',
    conventionsPageDescription:
      'Comics conventions worth a creator’s table — where to show your work, meet readers, and find your scene. Independent-comics focused.',
    conventionVisitLabel: 'Official site',
    ragPageTitle: 'ND Riot Rag',
    ragPageDescription:
      'The ND Riot Rag — our magazine. Read each issue online or download the PDF free; other editions are linked where you can get them.',
    ragArchiveHeading: 'Past issues',
    ragReadLabel: 'Read online',
    ragDownloadLabel: 'Download PDF',
    ragBuyHeading: 'Get it here',
    ragTocHeading: 'In this issue',
    ragContributorsHeading: 'Contributors',
    ragOtherHeading: 'Other issues',
    genreBooksHeading: 'Comics',
    genreCreatorsHeading: 'Comic Creators working in this genre',
    everythingElseHeading: 'While you are here',
    discoverLabel: 'Discover',
    spinLabel: 'Spin the rack',
    feedMineHeading: 'My Feed',
    searchHomeLabel: 'Search comics and comic creators',
    searchBooksLabel: 'Search titles and comic creators',
    searchCreatorsLabel: 'Search comic creators and studios',
    downloadCta: 'Download',
    previewCta: 'Read a preview (PDF)',
    buyHeading: 'Get it here',
    feedHeading: 'Latest from {name}',
    saveLabel: 'Save',
    savedLabel: 'Saved',
    accountTitle: 'Your ND Riot',
    accountUserHeading: 'User Profile',
    accountUserCreatorHeading: 'User + Creator Profile',
    accountComicsHeading: 'Your Comics',
    accountMediaHeading: 'Your Media',
    accountEditLabel: 'Edit',
    accountViewCreatorLabel: 'Creator Profile',
    accountViewMediaLabel: 'Media Page',
    accountSavedComicsHeading: 'Your Saved Comics',
    accountSavedCreatorsHeading: 'Favorite Creators',
    accountRemoveLabel: 'Remove',
    accountPostHeading: 'Post an Update',
    accountPostIntro:
      'A quick note to your followers — a new page, a con, a campaign. Everyone who saved this comic or your profile sees it. Keep it short; 200 characters.',
    accountPostTargetLabel: 'About',
    accountPostTargetPlaceholder: 'Profile or Book update?',
    accountPostCreatorsGroup: 'Your Profiles',
    accountPostComicsGroup: 'Your Comics',
    accountPostKindLabel: 'Type of Update',
    accountPostKindPlaceholder: 'Select One',
    accountPostPlaceholder: 'What’s new?',
    accountPostMentionsLabel: 'Mention (optional)',
    accountPostMentionSearch: 'Search creators and conventions…',
    accountPostMentionNoMatch: 'No matches.',
    accountPostMentionCreators: 'Creators',
    accountPostMentionConventions: 'Conventions',
    accountPostSubmitLabel: 'Post Update',
    accountPostSuccess: 'Posted. Your followers will see it.',
    accountFeedHeading: 'Your Feed',
    accountFeedEmpty: 'Nothing yet. Updates from comics and creators you’ve saved show up here.',
    accountSignInTitle: 'Sign in to save comics and creators',
    accountSignInBody:
      'ND Riot uses Google sign-in — it only confirms it’s you, and your saves stay private.',
    accountSignInCta: 'Sign in with Google',
    accountNewsletterHeading: 'Monthly Updates',
    accountNewsletterBody:
      'New comics, creators, and indie-comics resources — once a month, no more. Confirm by email; unsubscribe anytime.',
    accountNewsletterCta: 'Sign me up',
    footerGetListedHeading: 'Get Listed',
    footerRiotHeading: 'The Riot',
    footerJoinCreatorsLabel: 'Comic Creators',
    footerJoinComicsLabel: 'Comics',
    footerJoinMediaLabel: 'Media',
    footerAboutLabel: 'About',
    navLoginLabel: 'Login',
    navJoinLabel: 'Join',
    creatorBooksHeading: '{name}’s Comics',
    creatorUpdatesHeading: '{name}’s Updates',
    creatorWorksHeading: 'Where to find {name}’s work',
    creatorOrganizationsHeading: 'Member of',
    creatorFavoritesHeading: '{name}’s Cosigns',
    otherBooksHeading: 'Other comics by {name}',
    bookCreatorsHeading: 'Comic Creators:',
    editorialAuthorHeading: 'Author:',
    openToCollaborationLabel: 'Open to collaboration',
    mediaPageHeading: 'Media covering indie comics',
    mediaIntro:
      'A starting point for comic creators seeking coverage, and readers seeking shows. Listed alphabetically — no rankings.',
    mediaDisclaimer:
      'An independent, unaffiliated list. A listing here is a resource, not an ND Riot endorsement or partnership.',
    mediaPitchHeading: 'How to get covered',
    mediaLinksHeading: 'Where to find them',
    mediaGenresHeading: 'Covered Genres',
    shareLabel: 'Share',
    linkCopiedLabel: 'Link copied',
  },
  empty: {
    books: 'No comics yet — add comic creators and comics in the Studio.',
    creators: 'No comic creators yet.',
    genreBooks: 'No comics in this genre yet.',
    formatBooks: 'No comics in this format yet.',
    genreCreators: 'No comic creators list this genre yet.',
    filteredBooks: 'Nothing matches all of those at once. Try loosening one.',
    filteredCreators: 'No comic creators match all of those at once. Try loosening one.',
    columns: 'No columns yet.',
    interviews: 'No interviews yet.',
    resources: 'No resources yet — check back soon.',
    conventions: 'No conventions listed yet — check back soon.',
    ragIssues: 'The first issue is on its way — check back soon.',
    media: 'No media listed yet.',
    saved: 'Nothing saved yet — tap Save on any comic or creator and it lands here.',
  },
  // All top-level plain links — on-page filters cover browsing, so there's no
  // mega-menu. Resources is a single listing (downloads folded in as a resource
  // kind); the Rag (magazine) is its own destination. Join the Riot + Contact
  // live in the footer.
  nav: [
    { _type: 'navLink', label: 'Comics', href: '/books' },
    { _type: 'navLink', label: 'Comic Creators', href: '/creators' },
    // The supporting family lives in one dropdown so it stops eating top-level
    // slots as it grows (Comic Shops land here next). Named "For Creators" so
    // "Resources" only ever labels the category group inside — the resource
    // categories (live, non-empty) sit as peers of the Conventions/Media
    // directories, all reachable from the nav.
    {
      _type: 'navPanel',
      label: 'For Creators',
      groups: [
        { heading: 'Resources', useResourceCategories: true },
        {
          heading: 'Directories',
          links: [
            { label: 'Conventions', href: '/conventions' },
            { label: 'Media Outlets', href: '/media' },
          ],
        },
      ],
    },
    { _type: 'navLink', label: 'ND Riot Rag', href: '/magazine' },
    // "WTH?" = the newcomer's "what is this?" — orientation is user-serving, so
    // it earns a nav slot; the punk label keeps it an invitation, not an About.
    { _type: 'navLink', label: 'WTH?', href: '/about' },
  ],
}

export const SITE_SETTINGS_QUERY = `*[_id=="siteSettings"][0]{
  siteTitle,siteDescription,footer,discordUrl,socialLinks[]{platform,url},
  newsletter{heading,description,placeholder,buttonLabel,consent,successMessage,errorMessage},
  about{heading,body,faqHeading,faq[]{question,answer},seoTitle,seoDescription},aiLetter,
  home,sections,empty,creatorIntake,bookIntake,mediaIntake,notifications,
  hero{background,headline,body,tagline,featureCtaLabel,featuredHeading,newHeading,ctas[]{label,href}},
  join{heading,body,ctaLabel,formUrl,funnelHeading,funnelIntro,creatorsLabel,creatorsDesc,contactLabel,contactDesc,mediaLabel,mediaDesc,readersLabel,readersDesc,readersBadge,terms,termsWhy},
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
    newsletter: mergeGroup(DEFAULTS.newsletter, data.newsletter),
    notifications: mergeGroup(DEFAULTS.notifications, data.notifications),
    discordUrl: data.discordUrl?.trim() || DEFAULTS.discordUrl,
    socialLinks: data.socialLinks?.length ? data.socialLinks : DEFAULTS.socialLinks,
    about: {
      heading: data.about?.heading?.trim() || DEFAULTS.about.heading,
      body: data.about?.body?.length ? data.about.body : undefined,
      faqHeading: data.about?.faqHeading?.trim() || DEFAULTS.about.faqHeading,
      faq: data.about?.faq?.length
        ? data.about.faq
            .map((f) => ({ question: f.question?.trim() ?? '', answer: f.answer?.trim() ?? '' }))
            .filter((f) => f.question && f.answer)
        : DEFAULTS.about.faq,
      seoTitle: data.about?.seoTitle?.trim() || DEFAULTS.about.seoTitle,
      seoDescription: data.about?.seoDescription?.trim() || DEFAULTS.about.seoDescription,
    },
    aiLetter: data.aiLetter?.trim() || DEFAULTS.aiLetter,
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
      funnelHeading: data.join?.funnelHeading?.trim() || DEFAULTS.join.funnelHeading,
      funnelIntro: data.join?.funnelIntro?.trim() || DEFAULTS.join.funnelIntro,
      creatorsLabel: data.join?.creatorsLabel?.trim() || DEFAULTS.join.creatorsLabel,
      creatorsDesc: data.join?.creatorsDesc?.trim() || DEFAULTS.join.creatorsDesc,
      contactLabel: data.join?.contactLabel?.trim() || DEFAULTS.join.contactLabel,
      contactDesc: data.join?.contactDesc?.trim() || DEFAULTS.join.contactDesc,
      mediaLabel: data.join?.mediaLabel?.trim() || DEFAULTS.join.mediaLabel,
      mediaDesc: data.join?.mediaDesc?.trim() || DEFAULTS.join.mediaDesc,
      readersLabel: data.join?.readersLabel?.trim() || DEFAULTS.join.readersLabel,
      readersDesc: data.join?.readersDesc?.trim() || DEFAULTS.join.readersDesc,
      readersBadge: data.join?.readersBadge?.trim() || DEFAULTS.join.readersBadge,
      terms: data.join?.terms?.trim() || DEFAULTS.join.terms,
      termsWhy: data.join?.termsWhy?.trim() || DEFAULTS.join.termsWhy,
    },
    creatorIntake: mergeGroup(DEFAULTS.creatorIntake, data.creatorIntake),
    bookIntake: mergeGroup(DEFAULTS.bookIntake, data.bookIntake),
    mediaIntake: mergeGroup(DEFAULTS.mediaIntake, data.mediaIntake),
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

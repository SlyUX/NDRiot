import type { StructureResolver } from 'sanity/structure'

/**
 * Production Studio sidebar — grouped to mirror the site's own IA instead of
 * one flat alphabetical type list.
 *
 * Three things this buys us:
 *  1. "Pending review" sits at the very top: every draft across every type in
 *     one glance. Owner edits land as drafts (the draft/publish split IS the
 *     approval queue), so this list is the queue. Sanity's built-in per-row
 *     draft/published status dots come along for free.
 *  2. Content folders follow the public nav (Creators, Comics, Editorial,
 *     Downloads, Magazine, …) so editors look where the reader would.
 *  3. `siteSettings` stays a pinned singleton — without a fixed document id,
 *     editors could create a second one and the site would read whichever the
 *     query returned first. Paired with `newDocumentOptions` in
 *     sanity.config.ts, which hides it from the global create menu.
 *
 * The private `ndriot_auth` types (messages, forum, rag submissions, spinner
 * stores) are never referenced here — they're managed in the Operations
 * workspace against that dataset. Listing them explicitly is also what retires
 * the old auto-list, which surfaced them in production as always-empty panes.
 */

type S = Parameters<StructureResolver>[0]

/** A folder of document types, titled, drilling into each type's own list. */
const folder = (S: S, id: string, title: string, types: string[]) =>
  S.listItem()
    .id(id)
    .title(title)
    .child(
      S.list()
        .id(id)
        .title(title)
        .items(types.map((t) => S.documentTypeListItem(t))),
    )

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // The approval queue — every unpublished draft, across all types.
      S.listItem()
        .id('pendingReview')
        .title('Pending review')
        .child(
          S.documentList()
            .id('pendingReview')
            .title('Pending review')
            .apiVersion('2024-10-01')
            .filter('_id in path("drafts.**")'),
        ),

      S.divider(),

      // Content, in public-nav order.
      folder(S, 'creators', 'Creators & Organizations', [
        'creator',
        'organization',
        'update',
      ]),
      S.documentTypeListItem('book').title('Comics'),
      folder(S, 'strips', 'Strips', ['strip', 'stripSeries']),
      folder(S, 'editorial', 'Editorial', ['column', 'interview']),
      folder(S, 'downloads', 'Downloads & Resources', [
        'freeDownload',
        'resource',
        'ally',
      ]),
      folder(S, 'magazine', 'Magazine', ['ragIssue', 'noiseIssue']),
      folder(S, 'conventions', 'Conventions & Places', [
        'convention',
        'conventionAppearance',
        'venueRating',
      ]),
      S.documentTypeListItem('media').title('Press & Media'),
      folder(S, 'home', 'Home & Discovery', ['homepageFeature', 'hubPage']),

      S.divider(),

      // Config, pinned to a single document.
      S.listItem()
        .id('siteSettings')
        .schemaType('siteSettings')
        .title('Site settings')
        .child(
          S.editor().id('siteSettings').schemaType('siteSettings').documentId('siteSettings'),
        ),
    ])

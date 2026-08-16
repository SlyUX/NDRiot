/**
 * Where an update mention links. Comics, creators, conventions, and media
 * outlets can all be @-mentioned; each resolves to its own public page. Shared
 * by every place that renders a mention (the feed rows and the hero rail) so the
 * routes never drift apart.
 */
export function mentionHref(mention: {
  _type: string;
  slug: string;
}): string {
  switch (mention._type) {
    case "book":
      return `/books/${mention.slug}`;
    case "convention":
      return `/conventions/${mention.slug}`;
    case "media":
      return `/media/${mention.slug}`;
    default:
      return `/creators/${mention.slug}`;
  }
}

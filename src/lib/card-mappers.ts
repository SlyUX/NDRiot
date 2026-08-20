import type { ContentCardProps } from "@/components/content-card";
import { formatPlace } from "@/lib/place";
import { conventionRatingAverage } from "@/lib/ratings";
import type {
  BookSummary,
  ColumnSummary,
  ConventionSummary,
  CreatorSummary,
  DownloadSummary,
  FavoriteCreator,
  HomeEditorial,
  InterviewSummary,
  MediaSummary,
  RagIssueSummary,
  ResourceKind,
  ResourceSummary,
  SanityImage,
} from "@/lib/types";
import { truncate } from "@/lib/utils";

/**
 * Sanity projection → ContentCard props.
 *
 * This is the layer that absorbs schema differences, so ContentCard itself
 * stays presentational and there's exactly one card component (AGENTS.md §4).
 * Date formatting lives here too — ContentCard takes display strings only.
 */

/**
 * "Jul 30, 2026" — month first, US style. Stable across locales and
 * server/client, unlike bare toLocaleDateString(). Uppercased by CSS where the
 * surrounding label is (e.g. a campaign's "Ends" line) → "JUL 30, 2026".
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  // Sanity `date` values are plain calendar dates ("2026-07-31"); Date parses
  // them as UTC midnight, so formatting in the runtime's zone (Vercel is UTC,
  // a laptop is not) would shift a deadline a day earlier west of UTC. Pin to
  // UTC so the day shown is always the day stored.
  timeZone: "UTC",
});

export function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : DATE_FORMAT.format(parsed);
}

export function bookToCard(book: BookSummary): ContentCardProps {
  return {
    title: book.title,
    href: `/books/${book.slug}`,
    itemType: "book",
    itemId: book._id,
    image: book.cover,
    // Fallback only — book.cover.alt wins when set. Empty is right for cover
    // art sitting directly above its own title; announcing it twice is noise.
    imageAlt: "",
    eyebrow: book.creatorName,
    genres: book.genres,
    format: book.format,
    maturity: book.maturity,
    fundingUrl: book.fundingUrl,
    // Shown on hover over the cover (desktop) — the opening of the description.
    hoverText: truncate(book.descriptionText, 200),
    aspectRatio: "cover",
  };
}

/**
 * A "favorite creator" shout-out → a card.
 *
 * These are all on-site in practice, so the common path is a full creator card
 * that links to their profile with their portrait and a bio preview. An
 * off-site favourite (name + url, no ND Riot profile) becomes a plain linked
 * card; one with neither a profile nor a link has nothing to point at and is
 * dropped by the caller.
 */
export function favoriteToCard(
  favorite: FavoriteCreator,
): ContentCardProps | null {
  if (favorite.onSite?.slug) {
    const c = favorite.onSite;
    return {
      title: c.name ?? "Creator",
      href: `/creators/${c.slug}`,
      image: c.photo,
      fallbackInitials: c.name ?? "Creator",
      imageAlt: `Portrait of ${c.name ?? "creator"}`,
      eyebrow: c.studio?.name ?? formatPlace(c.place),
      summary: truncate(c.bioText, 160),
      aspectRatio: "square",
    };
  }
  return null;
}

export function creatorToCard(creator: CreatorSummary): ContentCardProps {
  return {
    title: creator.name,
    href: `/creators/${creator.slug}`,
    itemType: "creator",
    itemId: creator._id,
    image: creator.photo,
    fallbackInitials: creator.name,
    imageAlt: `Portrait of ${creator.name}`,
    // Studio name identifies a creator more usefully than a city does, and
    // makes the card findable by studio. Structured place is the fallback.
    eyebrow: creator.studio?.name ?? formatPlace(creator.place),
    // A short bio preview for the horizontal card (the homepage creators row).
    // Only the horizontal layout renders summary, so this is inert on the
    // vertical listing cards. bioText is pt::text(bio) — see the queries.
    summary: truncate(creator.bioText, 160),
    aspectRatio: "square",
  };
}

/**
 * A referenced creator — a book's creator, an article's author/interviewer —
 * as an author card. Same output as creatorToCard, but from the nested
 * `creator->{…}` / `author->{…}` projection rather than a top-level
 * CreatorSummary, and null-safe: the reference (or its slug) can be missing, in
 * which case there is nothing to link to and it returns null.
 */
export interface CreatorRef {
  name?: string | null;
  slug?: string | null;
  place?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  } | null;
  photo?: SanityImage | null;
  bioText?: string | null;
  studio?: { name?: string | null } | null;
}

export function creatorRefToCard(
  creator: CreatorRef | null | undefined,
): ContentCardProps | null {
  if (!creator?.slug) return null;
  return {
    title: creator.name ?? "Creator",
    href: `/creators/${creator.slug}`,
    image: creator.photo ?? null,
    fallbackInitials: creator.name ?? "Creator",
    imageAlt: `Portrait of ${creator.name ?? "creator"}`,
    eyebrow: creator.studio?.name ?? formatPlace(creator.place) ?? undefined,
    summary: truncate(creator.bioText, 160),
    aspectRatio: "square",
  };
}

export function columnToCard(column: ColumnSummary): ContentCardProps {
  return {
    title: column.title,
    href: `/editorial/columns/${column.slug}`,
    // The 4:3 card thumbnail; the 16:9 header image is the fallback.
    image: column.thumbnail ?? column.cover,
    imageAlt: "",
    eyebrow: column.authorName,
    summary: column.excerpt,
    date: formatDate(column.publishedAt),
    aspectRatio: "landscape",
  };
}

export function interviewToCard(interview: InterviewSummary): ContentCardProps {
  return {
    title: interview.title,
    href: `/editorial/interviews/${interview.slug}`,
    image: interview.thumbnail ?? interview.cover,
    imageAlt: "",
    eyebrow: interview.subjectName,
    summary: interview.excerpt,
    date: formatDate(interview.publishedAt),
    aspectRatio: "landscape",
  };
}

/**
 * A mixed column/interview row (the homepage editorial row) → a card,
 * discriminated by `_type`. Same output as columnToCard/interviewToCard, from
 * the combined HOME_EDITORIAL_QUERY shape.
 */
export function editorialToCard(item: HomeEditorial): ContentCardProps {
  const isColumn = item._type === "column";
  return {
    title: item.title,
    href: isColumn
      ? `/editorial/columns/${item.slug}`
      : `/editorial/interviews/${item.slug}`,
    image: item.thumbnail ?? item.cover,
    imageAlt: "",
    eyebrow: isColumn ? item.authorName : item.subjectName,
    summary: item.excerpt,
    date: formatDate(item.publishedAt),
    aspectRatio: "landscape",
  };
}

export function mediaToCard(media: MediaSummary): ContentCardProps {
  return {
    title: media.name,
    href: `/media/${media.slug}`,
    image: media.logo,
    // Decorative — the name sits right beside it; a missing logo falls back to
    // a plain box (CardImage), which is fine here.
    imageAlt: "",
    eyebrow: media.kinds?.length ? media.kinds.join(" · ") : undefined,
    summary: truncate(media.about, 160),
    aspectRatio: "square",
  };
}

export function conventionToCard(
  convention: ConventionSummary,
  /** CMS "no ratings yet" copy, shown muted when a con has no ratings. Omit to
   *  hide the rating line entirely (contexts that don't surface it). */
  ratingEmptyLabel?: string,
): ContentCardProps {
  // Prefer the real occurrence date; fall back to the free-text hint.
  const start = formatDate(convention.startDate);
  const end = formatDate(convention.endDate);
  const date = start
    ? end && end !== start
      ? `${start} – ${end}`
      : start
    : (convention.whenHint ?? undefined);

  const average = conventionRatingAverage(convention.ratings);
  const rating =
    average != null
      ? { value: average.toFixed(1), rated: true }
      : ratingEmptyLabel
        ? { value: ratingEmptyLabel, rated: false }
        : undefined;

  return {
    title: convention.name,
    href: `/conventions/${convention.slug}`,
    image: convention.image,
    // Real alt if the editor gave it (a logo/banner); the name sits beside it,
    // so a blank falls back to a plain box.
    imageAlt: convention.image?.alt ?? "",
    eyebrow: formatPlace(convention.place) ?? undefined,
    summary: truncate(convention.description, 160),
    date,
    rating,
    // Con cards read Location · Name · Date · Rating · Description.
    metaFirst: true,
    aspectRatio: "square",
  };
}

export function downloadToCard(download: DownloadSummary): ContentCardProps {
  return {
    title: download.title,
    href: `/downloads/${download.slug}`,
    image: download.cover,
    imageAlt: "",
    eyebrow: download.creatorName,
    summary: download.description,
    aspectRatio: "cover",
  };
}

/** Reader-facing label for a resource's kind — a system classification (like a
 *  genre/format badge), so it lives in code, not the CMS. Shared with the
 *  /resources listing cards. */
export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  video: "Video",
  download: "Download",
  link: "Link",
  guide: "Guide",
};

export function ragIssueToCard(issue: RagIssueSummary): ContentCardProps {
  return {
    title: issue.title,
    href: `/magazine/${issue.slug}`,
    image: issue.cover,
    imageAlt: "",
    // "Issue N" is a structural label (code), like a page number.
    eyebrow: `Issue ${issue.issueNumber}`,
    date: formatDate(issue.publishedAt),
    aspectRatio: "cover",
  };
}

export function resourceToCard(resource: ResourceSummary): ContentCardProps {
  return {
    title: resource.title,
    href: `/resources/${resource.slug}`,
    // Optional — a resource without a cover shows the plain box, like any
    // imageless card. Kind + category still identify it below.
    image: resource.image,
    imageAlt: "",
    eyebrow: `${RESOURCE_KIND_LABEL[resource.kind]} · ${resource.category}`,
    summary: resource.description,
    aspectRatio: "landscape",
  };
}

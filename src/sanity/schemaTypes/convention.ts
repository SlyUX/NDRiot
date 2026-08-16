import { defineType, defineField } from "sanity";

/**
 * A comics convention — a place creators table, meet readers, and launch work.
 *
 * Modeled as an *evergreen venue*, not a dated occurrence: a convention recurs,
 * so we store where it is and roughly when ("Every July"), not one year's hard
 * dates that go stale. That also lets creator ratings (a later phase) accumulate
 * on the con itself across years, rather than fragmenting per occurrence.
 *
 * Directory at /conventions, detail at /conventions/[slug]. Listed in neutral
 * (alphabetical) order — never by rating (AGENTS.md §3): a convention is a venue
 * being reviewed, not a contributor, and reviews must not order discovery.
 *
 * Built to extend: comic shops are the same shape and will arrive as a sibling
 * type sharing the ratings machinery — see the ratings plan.
 */
export default defineType({
  name: "convention",
  title: "Convention",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: 'The convention’s name — e.g. "Short Run" or "SPX".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL at /conventions/[slug]. Generate it from the name.",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "place",
      title: "Location",
      type: "place",
      description:
        'Structured city + state. The state powers "shows in your region".',
    }),
    defineField({
      name: "whenHint",
      title: "When (recurring hint)",
      type: "string",
      description:
        'Roughly when it happens each year — e.g. "Every July". The evergreen fallback shown when no hard dates are set.',
    }),
    defineField({
      name: "startDate",
      title: "Next occurrence — start",
      type: "date",
      description:
        'Start date of the next occurrence. When it passes, the con shows a "dates need verifying" badge and reopens date suggestions.',
    }),
    defineField({
      name: "endDate",
      title: "Next occurrence — end",
      type: "date",
      description:
        "End date (for multi-day cons). Leave blank for a single-day event.",
      validation: (rule) =>
        rule
          .min(rule.valueOfField("startDate"))
          .warning("End is before start."),
    }),
    defineField({
      name: "datesVerified",
      title: "Dates verified",
      type: "boolean",
      description:
        'Admin-confirmed the dates are correct. Only a verified con with a future date is treated as truly "upcoming"; verifying closes date suggestions until the date next passes.',
      initialValue: false,
    }),
    defineField({
      name: "communitySubmitted",
      title: "Community-submitted",
      type: "boolean",
      description:
        "A creator added this convention (vs. an editor). Such entries go live but stay flagged until an admin verifies them.",
      initialValue: false,
    }),
    defineField({
      name: "imageApproved",
      title: "Image approved",
      type: "boolean",
      description:
        "Gates public display of the logo/banner. Editor-added images are approved; a community-submitted image is held (a placeholder shows) until an admin approves it here.",
      initialValue: true,
    }),
    defineField({
      name: "website",
      title: "Website",
      type: "url",
      description: "The official site. Opens in a new tab.",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description:
        "A short line on what it is and who it’s for. Shown on the card and the page.",
    }),
    defineField({
      name: "image",
      title: "Logo or banner",
      type: "imageWithAlt",
      description:
        "The convention’s logo or a banner. Optional; add real alt text.",
    }),
  ],
  orderings: [
    { name: "alpha", title: "Name", by: [{ field: "name", direction: "asc" }] },
  ],
  preview: {
    select: {
      title: "name",
      city: "place.city",
      region: "place.region",
      media: "image",
    },
    prepare: ({ title, city, region, media }) => ({
      title,
      subtitle: [city, region].filter(Boolean).join(", "),
      media,
    }),
  },
});

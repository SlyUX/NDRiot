import { defineType, defineField } from "sanity";

import { GENRES, MATURITY_DESCRIPTIONS, MATURITY_RATINGS } from "@/lib/taxonomy";

/**
 * A Strip — a single-page comic HOSTED on ND Riot (the actual work is shown
 * here, unlike a `book`, which links out to where you buy/read it). Curated in
 * Studio for now (review-gated: being published IS the approval, and the human
 * review is the content-safety safeguard). Single-page by design — one image,
 * so no reader/pagination. Shown on the creator's profile, as a Home row, and
 * under a Strips tab on the Comics page.
 */
export default defineType({
  name: "strip",
  title: "Strip",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "creator",
      title: "Creator",
      type: "reference",
      to: [{ type: "creator" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "series",
      title: "Series",
      type: "reference",
      to: [{ type: "stripSeries" }],
      description:
        "Optional — group this with related strips (a recurring feature or shared world). Should belong to the same creator.",
    }),
    defineField({
      name: "image",
      title: "The strip (single page)",
      type: "imageWithAlt",
      description:
        "The full single-page comic, shown on ND Riot. Web-sized — keep the longest edge ≤ 2000px.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "text",
      rows: 2,
      description: "Optional — a short line shown beneath the strip (≤ 150 characters).",
      validation: (rule) => rule.max(150),
    }),
    defineField({
      name: "genres",
      title: "Genres",
      type: "array",
      of: [{ type: "string", options: { list: [...GENRES] } }],
      options: { layout: "grid" },
      validation: (rule) => rule.max(3).unique(),
    }),
    defineField({
      name: "maturity",
      title: "Maturity",
      type: "string",
      options: {
        list: MATURITY_RATINGS.map((value) => ({
          title: `${value} — ${MATURITY_DESCRIPTIONS[value]}`,
          value,
        })),
      },
      description:
        "Drives the same maturity handling as comic covers — a restricted strip is held behind the overlay in listings.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      description: "Orders the strips — newest first (§3: recency, never ranked).",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "creator.name", media: "image" },
  },
});

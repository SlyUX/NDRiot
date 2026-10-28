import { defineType, defineField } from "sanity";

import {
  GENRES,
  STRIP_MATURITY_TIERS,
  MATURITY_TIER_LABELS,
  MATURITY_TIER_DESCRIPTIONS,
  RATING_SOURCES,
} from "@/lib/taxonomy";

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
      name: "maturityRating",
      title: "Maturity",
      type: "string",
      options: {
        list: STRIP_MATURITY_TIERS.map((value) => ({
          title: `${MATURITY_TIER_LABELS[value]} — ${MATURITY_TIER_DESCRIPTIONS[value]}`,
          value,
        })),
        layout: "radio",
      },
      description:
        "Strips are public — no account, no gate — so they cap at Teen. If a page needs Mature content, list it as a book that links out instead.",
      // Guards the Studio dropdown and CLI writes (Sanity validation does NOT run
      // on raw API writes). The creator submission path enforces the same cap
      // itself — see STRIP_ALLOWED_RATINGS in strip-intake.ts.
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === undefined || (STRIP_MATURITY_TIERS as readonly string[]).includes(value)
              ? true
              : "Strips cannot be Mature — list it as a book that links out instead.",
          ),
    }),
    defineField({
      name: "ratingSource",
      title: "Rating set by",
      type: "string",
      options: { list: RATING_SOURCES.map((value) => ({ title: value, value })) },
      initialValue: "creator",
      readOnly: true,
    }),
    defineField({
      name: "ratingNote",
      title: "Rating note (operator)",
      type: "string",
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

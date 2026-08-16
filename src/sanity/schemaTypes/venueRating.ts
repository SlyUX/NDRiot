import { defineType, defineField } from "sanity";

import { CONVENTION_RATING_ASPECTS, TABLE_COST_LEVELS } from "@/lib/taxonomy";

/**
 * One creator's rating of a venue — a convention now, comic shops later (the
 * `target` reference is polymorphic-ready). One document per creator per venue
 * (deterministic id `rating-<creatorId>-<targetId>`), written through the site
 * ownership-gated, and gated on the creator having an appearance at the venue.
 *
 * §3 (binding): a venue is a place being reviewed, not a contributor — so
 * ratings are ALLOWED, but they INFORM and never ORDER discovery. The directory
 * stays neutrally ordered; display is per-aspect averages only (never a single
 * composite/leaderboard score), plus attributed notes.
 *
 * Site-generated — not meant to be created by hand in the Studio; it appears
 * here for moderation/visibility.
 */
export default defineType({
  name: "venueRating",
  title: "Venue rating",
  type: "document",
  fields: [
    defineField({
      name: "creator",
      title: "Creator",
      type: "reference",
      to: [{ type: "creator" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "target",
      title: "Venue",
      type: "reference",
      to: [{ type: "convention" }],
      description:
        "The rated venue. Polymorphic-ready — comic shops join here later.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "benefits",
      title: "Benefits (1–5, higher = better)",
      type: "object",
      description: "Each optional — rate only what you can speak to.",
      fields: CONVENTION_RATING_ASPECTS.map((aspect) =>
        defineField({
          name: aspect.code,
          title: aspect.label,
          type: "number",
          validation: (rule) => rule.min(1).max(5).integer(),
        }),
      ),
    }),
    defineField({
      name: "celebrityFocused",
      title: "Celebrity-focused",
      type: "boolean",
      description:
        "Descriptive flag, not a score — a draw to some creators, a red flag to others.",
    }),
    defineField({
      name: "tableCost",
      title: "Table cost",
      type: "string",
      options: { list: [...TABLE_COST_LEVELS], layout: "radio" },
      description:
        'Descriptive flag — the raw cost band, distinct from the rated "Table value".',
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "text",
      rows: 3,
      description: "Optional. Shown publicly, attributed to the creator.",
    }),
  ],
  preview: {
    select: { creator: "creator.name", target: "target.name" },
    prepare: ({ creator, target }) => ({
      title: `${creator ?? "—"} → ${target ?? "—"}`,
      subtitle: "Venue rating",
    }),
  },
});

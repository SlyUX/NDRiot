import { defineType, defineField } from "sanity";

/**
 * A Strip Series — a named grouping of related strips by one creator: a
 * recurring feature ("Retails"), a shared world, an ongoing storyline.
 * Deliberately lightweight — a title, a slug, the creator it belongs to, and an
 * optional line of description. The strips reference it (see `strip.series`);
 * the series page lists them in order. Review-gated like strips: a creator can
 * start one from the dashboard, and publishing it is the approval.
 */
export default defineType({
  name: "stripSeries",
  title: "Strip Series",
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
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
      description: "Optional — a short line about the series, shown on its page.",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "creator.name" },
  },
});

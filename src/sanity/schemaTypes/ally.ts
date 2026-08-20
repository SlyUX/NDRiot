import { defineType, defineField } from "sanity";

/**
 * An Ally — a vetted external partner/service ND Riot vouches for on creators'
 * behalf (distribution, printing, legal, etc.). Editorially curated in Studio
 * (no self-serve intake): being listed here IS the endorsement. Distinct from a
 * Resource (a broad tool/how-to) — an Ally is a hand-picked partner. The detail
 * page frames what they do for indie creators, then sends people to their site.
 */
export default defineType({
  name: "ally",
  title: "Ally",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "url",
      title: "Website",
      type: "url",
      description: "Their site — where the Visit button sends people.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "logo",
      title: "Logo or artwork",
      type: "imageWithAlt",
      description: "Optional. PNG or JPG that reads on a near-black background.",
    }),
    defineField({
      name: "offering",
      title: "What they offer",
      type: "string",
      description:
        'A short line, shown as an eyebrow — e.g. "Distribution to comic shops".',
    }),
    defineField({
      name: "about",
      title: "About",
      type: "text",
      rows: 5,
      description:
        "What they do for indie creators, in ND Riot's words — a paragraph or two.",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "offering", media: "logo" },
  },
});

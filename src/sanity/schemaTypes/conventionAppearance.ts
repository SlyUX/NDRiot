import { defineType, defineField } from "sanity";

import { APPEARANCE_STATUSES } from "@/lib/taxonomy";

/**
 * One creator's appearance at a convention — attending, or tabling (with an
 * optional table number). Its own document (deterministic id
 * `appearance-<creatorId>-<venueId>`), one per creator per venue, so it's a
 * clean owner-gated write from the dashboard and can't be clobbered by a
 * profile-edit draft the way an array field on the creator could.
 *
 * `forDate` stamps the occurrence at marking time so a marker for a past show
 * auto-expires (it's active only while forDate is in the future) rather than
 * silently claiming next year's — see the display filters.
 *
 * `venue` is polymorphic-ready (a convention now; comic shops later share the
 * shape). Site-generated — appears in the Studio for moderation, not hand entry.
 */
export default defineType({
  name: "conventionAppearance",
  title: "Convention appearance",
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
      name: "venue",
      title: "Convention",
      type: "reference",
      to: [{ type: "convention" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: [...APPEARANCE_STATUSES], layout: "radio" },
      initialValue: "attending",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tableNumber",
      title: "Table number",
      type: "string",
      description: "Only meaningful when tabling.",
    }),
    defineField({
      name: "forDate",
      title: "For occurrence date",
      type: "date",
      description:
        "The occurrence this marks — set from the convention at marking time. Drives auto-expiry.",
    }),
  ],
  preview: {
    select: {
      creator: "creator.name",
      venue: "venue.name",
      status: "status",
      table: "tableNumber",
    },
    prepare: ({ creator, venue, status, table }) => ({
      title: `${creator ?? "—"} @ ${venue ?? "—"}`,
      subtitle: [status, table && `table ${table}`].filter(Boolean).join(" · "),
    }),
  },
});

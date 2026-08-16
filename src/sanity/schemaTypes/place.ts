import { defineType, defineField } from "sanity";

import { US_STATES } from "@/lib/taxonomy";

/**
 * A region-level location — reused by conventions and creators.
 *
 * DELIBERATELY region-level, not a precise address: region is useful for
 * discovery ("shows / creators in your region") but safe to expose, where a
 * precise location is a privacy liability. `region` (a US-state code) is the
 * MATCH KEY; `city` is captured too, so a later zoom to city / distance is a
 * query change, never a re-collection. US-first — international entries use
 * city + country and leave region blank.
 */
export default defineType({
  name: "place",
  title: "Location",
  type: "object",
  fields: [
    defineField({
      name: "city",
      title: "City",
      type: "string",
      description:
        'e.g. "Seattle". Captured now so we can zoom in later without re-entry.',
    }),
    defineField({
      name: "region",
      title: "State",
      type: "string",
      options: {
        list: US_STATES.map((s) => ({ title: s.name, value: s.code })),
      },
      description:
        'US state — the match key for "in your region". Leave blank for international; use city + country instead.',
    }),
    defineField({
      name: "country",
      title: "Country",
      type: "string",
      initialValue: "United States",
    }),
  ],
  preview: {
    select: { city: "city", region: "region", country: "country" },
    prepare: ({ city, region, country }) => ({
      title:
        [city, region].filter(Boolean).join(", ") || country || "No location",
    }),
  },
});

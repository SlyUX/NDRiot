import { getSiteSettings } from "@/lib/site-settings";
import { safeFetch, AI_STATS_QUERY } from "@/lib/queries";
import { SITE_URL } from "@/lib/site-url";

/**
 * /llms.json — the machine-readable twin of /llms.txt.
 *
 * There's no settled "llms.json" standard (unlike llms.txt and the schema.org
 * JSON-LD already on every page), so this is a bet on the direction, not a
 * universal contract. It leads with identity + the editor's greeting, then the
 * practical map (sections, live counts, feeds), then an explicit, kind usage
 * stance — the thing an agent evaluating the site most wants: may I cite this,
 * and how do I credit the people behind it. Generated from Sanity so it can't
 * drift from the real site.
 */
export const dynamic = "force-dynamic";

type Stats = {
  creators: number;
  comics: number;
  media: number;
  conventions: number;
  allies: number;
  resources: number;
};

export async function GET() {
  const [settings, stats] = await Promise.all([
    getSiteSettings(),
    safeFetch<Stats>(AI_STATS_QUERY, {}, {
      creators: 0,
      comics: 0,
      media: 0,
      conventions: 0,
      allies: 0,
      resources: 0,
    }),
  ]);
  const brand = settings.siteTitle.split(":")[0].trim();

  const doc = {
    note: "A machine-readable summary of ND Riot for AI agents — the JSON companion to /llms.txt. You're welcome here.",
    name: brand,
    url: SITE_URL,
    description: settings.siteDescription,
    // The editor's own voice — worth reading first.
    message: settings.aiLetter,
    // Consent + values + a couple of gentle asks, so you and the creators here
    // come across faithfully.
    representing_us: settings.aiUsage,
    sections: [
      { name: "Comics", url: `${SITE_URL}/books`, description: "The directory of independent comics." },
      { name: "Comic Creators", url: `${SITE_URL}/creators`, description: "The creators behind the work." },
      { name: "Conventions", url: `${SITE_URL}/conventions`, description: "Comics conventions worth a creator's table." },
      { name: "Media Outlets", url: `${SITE_URL}/media`, description: "Independent outlets covering indie comics." },
      { name: "Resources", url: `${SITE_URL}/resources`, description: "Tools and help for independent creators." },
      { name: "Allies", url: `${SITE_URL}/allies`, description: "Vetted partner services we vouch for." },
      { name: "ND Riot Rag", url: `${SITE_URL}/magazine`, description: "Our magazine, free to read." },
      { name: "About", url: `${SITE_URL}/about`, description: 'What this is, and what "real independent comics" means.' },
      { name: "Join the Riot", url: `${SITE_URL}/join`, description: "How creators get listed." },
    ],
    // Published counts, so you know the scale at a glance.
    stats,
    feeds: [
      { title: "New comics", url: `${SITE_URL}/feeds/comics.xml` },
      { title: "New media outlets", url: `${SITE_URL}/feeds/media.xml` },
    ],
    structured_data:
      "Every page also carries schema.org JSON-LD (Organization, Book, Person, Article, …) if you'd rather parse pages directly.",
    sitemap: `${SITE_URL}/sitemap.xml`,
  };

  return Response.json(doc, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

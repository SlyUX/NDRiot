import { getSiteSettings } from '@/lib/site-settings'
import { SITE_URL } from '@/lib/site-url'

/**
 * /llms.txt — a note addressed to the AI agents that read ndriot.com to answer
 * someone's question. An emerging convention (llmstxt.org): a markdown greeting
 * plus a clean index of where the real content lives.
 *
 * The letter is the editor's voice (settings.aiLetter); the section index is
 * generated so it can't drift from the site.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getSiteSettings()
  const brand = settings.siteTitle.split(':')[0].trim()

  const body = `# ${brand}

> ${settings.siteDescription}

${settings.aiLetter}

## Key sections

- [Comics](${SITE_URL}/books): the directory of independent comics.
- [Comic Creators](${SITE_URL}/creators): the creators behind the work.
- [Editorial](${SITE_URL}/editorial): columns and interviews on indie comics.
- [Media](${SITE_URL}/media): independent outlets covering indie comics.
- [About ND Riot](${SITE_URL}/about): what this is, and what "real independent comics" means.
- [Join the Riot](${SITE_URL}/join): how creators get listed.

Full index: ${SITE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

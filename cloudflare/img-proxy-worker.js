/**
 * ND Riot — img.ndriot.com image proxy (Cloudflare Worker).
 *
 * WHY: the Cloudflare CSAM Scanning Tool only hashes images that pass through
 * Cloudflare's cache. Our images serve straight from Sanity's CDN
 * (cdn.sanity.io), which Cloudflare never sees — so nothing is scanned. This
 * Worker fronts Sanity's image CDN on img.ndriot.com so every image enters the
 * Cloudflare cache (and gets CSAM-hashed) on its way to the reader.
 *
 * It 1:1-mirrors the Sanity image path: the app emits
 *   https://img.ndriot.com/images/r9bvatt7/production/<asset>-<dims>.<ext>?<transform>
 * and this Worker fetches the identical path from https://cdn.sanity.io. Only
 * ND Riot's project id is allowed, so img.ndriot.com can't be abused as an open
 * proxy to arbitrary Sanity assets.
 *
 * DEPLOY (dashboard):
 *   1. Cloudflare → Workers & Pages → Create → Worker. Paste this file. Deploy.
 *   2. Open that Worker → Settings → Domains & Routes → Add → Custom Domain →
 *      "img.ndriot.com". Cloudflare manages the DNS/route and proxies it (this
 *      replaces the plain CNAME record that's there now).
 *   3. Verify in a browser:
 *      https://img.ndriot.com/images/r9bvatt7/production/20b57e2e9587d6f54e767e312e534be3e98185fb-1020x1050.png?w=320
 *      It should return an image. (That's a real published asset.)
 *
 * Once it serves an image, tell Claude and Step 3 (pointing the app's image
 * URLs at img.ndriot.com) ships.
 */

const SANITY_CDN = "cdn.sanity.io";
const ALLOWED_PREFIX = "/images/r9bvatt7/"; // ND Riot project only

const worker = {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith(ALLOWED_PREFIX)) {
      return new Response("Not found", { status: 404 });
    }

    // Same path + query string, re-pointed at Sanity's CDN host. fetch() sets
    // the Host header from this URL, which is what Sanity's shared CDN keys on.
    const origin = new URL(url.toString());
    origin.hostname = SANITY_CDN;
    origin.protocol = "https:";
    origin.port = "";

    const resp = await fetch(origin.toString(), {
      method: request.method,
      // Force the image into the Cloudflare cache so the CSAM tool hashes it.
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });

    // Pass the response through unchanged — preserves content-type and the
    // long cache headers Sanity already sets.
    return new Response(resp.body, resp);
  },
};

export default worker;

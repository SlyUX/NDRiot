import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Editorial became Downloads & Resources; both old listings point at the new
  // combined page. Exact sources only — the detail routes (/editorial/columns/…,
  // /downloads/…) are untouched and keep working.
  async redirects() {
    return [
      { source: '/editorial', destination: '/resources', permanent: true },
      { source: '/downloads', destination: '/resources', permanent: true },
      // "Books" → "Comics": the route was renamed for accuracy (the Sanity type
      // stays `book`). Permanent so search engines move the ranking to /comics;
      // query strings (?tab=strips, ?editing=) carry over automatically.
      { source: '/books', destination: '/comics', permanent: true },
      { source: '/books/:slug', destination: '/comics/:slug', permanent: true },
      { source: '/join/books', destination: '/join/comics', permanent: true },
    ]
  },
  experimental: {
    // The intake form posts creator photos and studio logos through a Server
    // Action; the 1MB default rejects them. The form downscales images in the
    // browser first, so this is generous headroom, kept under hosting body
    // caps rather than sized for raw phone photos.
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    // Images are served through img.ndriot.com — a Cloudflare Worker that fronts
    // Sanity's CDN so every image passes through Cloudflare's cache and is hashed
    // by the CSAM Scanning Tool (see src/sanity/image.ts + cloudflare/). The
    // path after the host is identical to Sanity's. cdn.sanity.io stays allowed
    // for any direct references (e.g. the Studio). Required for next/image —
    // without it, `urlFor()` URLs throw at render rather than at build.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.ndriot.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;

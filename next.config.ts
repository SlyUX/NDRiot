import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    // Sanity serves every asset from this host. Required for next/image —
    // without it, `urlFor()` URLs throw at render rather than at build.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;

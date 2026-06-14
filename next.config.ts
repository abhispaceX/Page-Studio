import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Contentful image CDN
      { protocol: "https", hostname: "images.ctfassets.net" },
      { protocol: "https", hostname: "downloads.ctfassets.net" },
      { protocol: "https", hostname: "videos.ctfassets.net" },
      // Common demo image sources used in seed content
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;

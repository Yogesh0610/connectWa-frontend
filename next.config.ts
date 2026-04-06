import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  env: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // TODO: replace ** with your specific storage domain for tighter security
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

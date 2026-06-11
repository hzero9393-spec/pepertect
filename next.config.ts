import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel handles its own build - no standalone output needed */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;

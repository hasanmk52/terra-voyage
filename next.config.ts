import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    AMADEUS_API_KEY: process.env.AMADEUS_API_KEY,
    AMADEUS_API_SECRET: process.env.AMADEUS_API_SECRET,
  }
};

export default nextConfig;

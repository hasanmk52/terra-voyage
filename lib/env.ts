import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_WEATHER_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  // Amadeus integration removed: AMADEUS_API_KEY and AMADEUS_API_SECRET omitted
  USE_MOCKS: z.string().optional(),
  NEXT_PUBLIC_USE_MOCKS: z.string().optional(),
});

export const env = envSchema.parse(process.env);

import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_WEATHER_API_KEY: z.string().optional(),
  NEXT_PUBLIC_AMADEUS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_AMADEUS_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  AMADEUS_API_KEY: z.string().optional(),
  AMADEUS_API_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_REST_URL: z.string().optional(),
  REDIS_REST_TOKEN: z.string().optional(),
  USE_MOCKS: z.string().optional(),
  NEXT_PUBLIC_USE_MOCKS: z.string().optional(),
})

export const env = envSchema.parse(process.env)
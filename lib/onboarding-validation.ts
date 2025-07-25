import { z } from "zod"

// Travel style assessment schema
export const travelStyleSchema = z.object({
  travelStyle: z.enum(["adventure", "luxury", "budget", "cultural", "relaxation", "mixed"]),
  pacePreference: z.enum(["slow", "moderate", "fast"]),
  groupSize: z.enum(["solo", "couple", "family", "group"]),
  budgetRange: z.enum(["budget", "mid-range", "luxury", "no-preference"]),
})

// Interests and preferences schema
export const interestsSchema = z.object({
  interests: z.array(z.enum([
    "culture", "food", "adventure", "relaxation", "nightlife", 
    "shopping", "nature", "art", "photography", "local-life",
    "luxury", "family", "romance", "business", "spiritual", "beach"
  ])).min(1, "Please select at least one interest"),
  dietaryRestrictions: z.array(z.enum([
    "vegetarian", "vegan", "gluten-free", "halal", "kosher", 
    "dairy-free", "nut-allergies", "other"
  ])).optional(),
  accessibilityNeeds: z.object({
    wheelchairAccess: z.boolean(),
    visualImpairment: z.boolean(),
    hearingImpairment: z.boolean(),
    mobilityAssistance: z.boolean(),
    other: z.string().optional(),
  }).optional(),
})

// Travel preferences schema
export const travelPreferencesSchema = z.object({
  accommodationType: z.enum(["budget", "mid-range", "luxury", "mixed"]),
  transportationPreference: z.enum(["walking", "public", "rental-car", "mixed"]),
  mealPreferences: z.enum(["local-food", "familiar-food", "fine-dining", "street-food", "mixed"]),
  activityLevel: z.enum(["low", "moderate", "high"]),
  culturalImmersion: z.enum(["minimal", "moderate", "deep"]),
})

// Complete onboarding data schema
export const onboardingDataSchema = z.object({
  travelStyle: travelStyleSchema,
  interests: interestsSchema,
  preferences: travelPreferencesSchema,
  completedAt: z.date().default(() => new Date()),
})

// Individual step validation
export const validateTravelStyle = (data: unknown) => {
  return travelStyleSchema.safeParse(data)
}

export const validateInterests = (data: unknown) => {
  return interestsSchema.safeParse(data)
}

export const validateTravelPreferences = (data: unknown) => {
  return travelPreferencesSchema.safeParse(data)
}

export const validateCompleteOnboarding = (data: unknown) => {
  return onboardingDataSchema.safeParse(data)
}

// Types
export type TravelStyleData = z.infer<typeof travelStyleSchema>
export type InterestsData = z.infer<typeof interestsSchema>
export type TravelPreferencesData = z.infer<typeof travelPreferencesSchema>
export type OnboardingData = z.infer<typeof onboardingDataSchema>

// Helper functions
export function getProgressPercentage(currentStep: number, totalSteps: number): number {
  return Math.round((currentStep / totalSteps) * 100)
}

export function getStepTitle(step: number): string {
  const titles = {
    1: "Welcome to Terra Voyage",
    2: "Tell us your travel style",
    3: "What interests you most?",
    4: "Your travel preferences",
    5: "Complete your profile"
  }
  return titles[step as keyof typeof titles] || "Setup"
}

export function getStepDescription(step: number): string {
  const descriptions = {
    1: "Let's create your personalized travel experience",
    2: "Help us understand how you like to travel",
    3: "Select activities and experiences you enjoy",
    4: "Fine-tune your travel preferences",
    5: "Review and save your profile"
  }
  return descriptions[step as keyof typeof descriptions] || "Complete the setup"
}

// Default values
export const defaultTravelStyle: TravelStyleData = {
  travelStyle: "mixed",
  pacePreference: "moderate",
  groupSize: "couple",
  budgetRange: "mid-range",
}

export const defaultInterests: InterestsData = {
  interests: [],
  dietaryRestrictions: [],
  accessibilityNeeds: {
    wheelchairAccess: false,
    visualImpairment: false,
    hearingImpairment: false,
    mobilityAssistance: false,
  },
}

export const defaultTravelPreferences: TravelPreferencesData = {
  accommodationType: "mid-range",
  transportationPreference: "mixed",
  mealPreferences: "mixed",
  activityLevel: "moderate",
  culturalImmersion: "moderate",
}
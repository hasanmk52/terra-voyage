import { z } from "zod"

// Base schemas for reusable types
export const travelPaceSchema = z.enum(["slow", "moderate", "fast"])
export const accommodationTypeSchema = z.enum(["budget", "mid-range", "luxury", "mixed"])
export const transportationSchema = z.enum(["walking", "public", "rental-car", "mixed"])
export const budgetRangeSchema = z.enum(["per-person", "total"])

// Destination validation schema
export const destinationSchema = z.object({
  destination: z
    .string()
    .min(2, "Destination must be at least 2 characters")
    .max(300, "Destination cannot exceed 300 characters")
    .regex(/^[a-zA-Z\s,.\-'()]+$/, "Invalid destination format"),
  placeId: z.string().optional(),
})

// Date range validation schema
export const dateRangeSchema = z
  .object({
    startDate: z.date({
      message: "Start date is required and must be valid",
    }),
    endDate: z.date({
      message: "End date is required and must be valid",
    }),
  })
  .refine(
    (data) => data.endDate > data.startDate,
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return data.startDate >= today
    },
    {
      message: "Start date cannot be in the past",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      const daysDiff = Math.ceil(
        (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysDiff <= 365
    },
    {
      message: "Trip cannot exceed 365 days",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      const daysDiff = Math.ceil(
        (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysDiff >= 1
    },
    {
      message: "Trip must be at least 1 day",
      path: ["endDate"],
    }
  )

// Traveler data validation schema
export const travelerDataSchema = z
  .object({
    adults: z
      .number()
      .int("Adults must be a whole number")
      .min(1, "At least 1 adult is required")
      .max(20, "Maximum 20 adults allowed"),
    children: z
      .number()
      .int("Children must be a whole number")
      .min(0, "Children cannot be negative")
      .max(10, "Maximum 10 children allowed"),
    infants: z
      .number()
      .int("Infants must be a whole number")
      .min(0, "Infants cannot be negative")
      .max(5, "Maximum 5 infants allowed"),
  })
  .refine(
    (data) => {
      const total = data.adults + data.children + data.infants
      return total <= 25
    },
    {
      message: "Total travelers cannot exceed 25",
      path: ["adults"],
    }
  )
  .refine(
    (data) => {
      const total = data.adults + data.children + data.infants
      return total >= 1
    },
    {
      message: "At least 1 traveler is required",
      path: ["adults"],
    }
  )

// Budget validation schema
export const budgetDataSchema = z.object({
  amount: z
    .number()
    .positive("Budget amount must be positive")
    .min(100, "Minimum budget is $100")
    .max(1000000, "Maximum budget is $1,000,000")
    .refine((val) => Number.isFinite(val), "Budget must be a valid number"),
  currency: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .regex(/^[A-Z]{3}$/, "Currency code must be in uppercase letters"),
  range: budgetRangeSchema,
})

// Interest categories validation schema
export const interestCategoriesSchema = z
  .array(
    z
      .string()
      .min(1, "Interest category cannot be empty")
      .regex(/^[a-z-]+$/, "Invalid interest category format")
  )
  .min(1, "At least 1 interest must be selected")
  .max(8, "Maximum 8 interests allowed")
  .refine(
    (interests) => {
      const uniqueInterests = new Set(interests)
      return uniqueInterests.size === interests.length
    },
    {
      message: "Duplicate interests are not allowed",
    }
  )

// Travel preferences validation schema
export const travelPreferencesSchema = z.object({
  pace: travelPaceSchema,
  accommodationType: accommodationTypeSchema,
  transportation: transportationSchema,
  accessibility: z.boolean(),
  dietaryRestrictions: z
    .array(
      z
        .string()
        .min(1, "Dietary restriction cannot be empty")
        .max(50, "Dietary restriction too long")
    )
    .max(10, "Maximum 10 dietary restrictions allowed"),
  specialRequests: z
    .string()
    .max(500, "Special requests cannot exceed 500 characters")
    .optional()
    .default(""),
})

// Complete trip planning form validation schema
export const tripPlanningFormSchema = z
  .object({
    // Step 1: Destination
    destination: destinationSchema,
    
    // Step 2: Dates
    dateRange: dateRangeSchema,
    
    // Step 3: Travelers
    travelers: travelerDataSchema,
    
    // Step 4: Budget
    budget: budgetDataSchema,
    
    // Step 5: Interests
    interests: interestCategoriesSchema,
    
    // Step 6: Preferences
    preferences: travelPreferencesSchema,
    
    // Optional trip details
    tripTitle: z
      .string()
      .min(3, "Trip title must be at least 3 characters")
      .max(100, "Trip title cannot exceed 100 characters")
      .optional(),
    tripDescription: z
      .string()
      .max(1000, "Trip description cannot exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => {
      // Validate budget makes sense for traveler count and trip duration
      const totalTravelers = data.travelers.adults + data.travelers.children + data.travelers.infants
      const tripDays = Math.ceil(
        (data.dateRange.endDate.getTime() - data.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      const budgetPerPersonPerDay = data.budget.range === "per-person" 
        ? data.budget.amount / tripDays
        : data.budget.amount / (totalTravelers * tripDays)
      
      // Minimum budget validation (very basic check)
      return budgetPerPersonPerDay >= 20 // $20 per person per day minimum
    },
    {
      message: "Budget appears too low for the selected trip duration and traveler count",
      path: ["budget", "amount"],
    }
  )

// Individual step validation schemas (for progressive validation)
export const stepSchemas = {
  destination: z.object({ destination: destinationSchema }),
  dates: z.object({ dateRange: dateRangeSchema }),
  travelers: z.object({ travelers: travelerDataSchema }),
  budget: z.object({ budget: budgetDataSchema }),
  interests: z.object({ interests: interestCategoriesSchema }),
  preferences: z.object({ preferences: travelPreferencesSchema }),
}

// Type inference for TypeScript
export type TripPlanningFormData = z.infer<typeof tripPlanningFormSchema>
export type DestinationData = z.infer<typeof destinationSchema>
export type DateRangeData = z.infer<typeof dateRangeSchema>
export type TravelerData = z.infer<typeof travelerDataSchema>
export type BudgetData = z.infer<typeof budgetDataSchema>
export type InterestCategories = z.infer<typeof interestCategoriesSchema>
export type TravelPreferences = z.infer<typeof travelPreferencesSchema>

// Validation helper functions
export function validateStep(step: keyof typeof stepSchemas, data: any) {
  try {
    stepSchemas[step].parse(data)
    return { success: true, errors: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => ({
          path: err.path.join("."),
          message: err.message,
        })),
      }
    }
    return {
      success: false,
      errors: [{ path: "unknown", message: "Validation failed" }],
    }
  }
}

export function validateCompleteForm(data: any) {
  try {
    const validatedData = tripPlanningFormSchema.parse(data)
    return { success: true, data: validatedData, errors: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.issues.map(err => ({
          path: err.path.join("."),
          message: err.message,
        })),
      }
    }
    return {
      success: false,
      data: null,
      errors: [{ path: "unknown", message: "Validation failed" }],
    }
  }
}

// Custom validation for common patterns
export const customValidators = {
  isValidDestination: (destination: string) => {
    return destination.length >= 2 && /^[a-zA-Z\s,.\-'()]+$/.test(destination)
  },
  
  isValidDateRange: (startDate: Date, endDate: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return (
      startDate >= today &&
      endDate > startDate &&
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) <= 365
    )
  },
  
  isValidTravelerCount: (adults: number, children: number, infants: number) => {
    const total = adults + children + infants
    return adults >= 1 && total <= 25 && children >= 0 && infants >= 0
  },
  
  isValidBudget: (amount: number, currency: string) => {
    return amount >= 100 && amount <= 1000000 && /^[A-Z]{3}$/.test(currency)
  },
}
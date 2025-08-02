import { z } from "zod"

// Location coordinate schema - allow 0,0 as valid coordinates
const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

// Location schema
const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  coordinates: coordinatesSchema,
})

// Pricing schema
const pricingSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  priceType: z.enum(["per_person", "per_group", "free"]),
})

// Accessibility schema
const accessibilitySchema = z.object({
  wheelchairAccessible: z.boolean(),
  hasElevator: z.boolean(),
  notes: z.string(),
})

// Activity schema
const activitySchema = z.object({
  id: z.string().min(1),
  timeSlot: z.enum(["morning", "afternoon", "evening"]),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  name: z.string().min(1),
  type: z.enum(["attraction", "restaurant", "experience", "transportation", "accommodation", "shopping"]),
  description: z.string().min(10),
  location: locationSchema,
  pricing: pricingSchema,
  duration: z.string().min(1), // e.g., "120 minutes"
  tips: z.array(z.string()).max(5),
  bookingRequired: z.boolean(),
  accessibility: accessibilitySchema,
})

// Daily budget schema
const dailyBudgetSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().length(3),
})

// Transportation schema
const transportationSchema = z.object({
  primaryMethod: z.enum(["walking", "public", "taxi", "rental_car"]),
  estimatedCost: z.number().min(0),
  notes: z.string(),
})

// Day schema
const daySchema = z.object({
  day: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  theme: z.string().min(1),
  activities: z.array(activitySchema).min(1).max(10),
  dailyBudget: dailyBudgetSchema,
  transportation: transportationSchema,
})

// Budget breakdown schema
const budgetBreakdownSchema = z.object({
  accommodation: z.number().min(0),
  food: z.number().min(0),
  activities: z.number().min(0),
  transportation: z.number().min(0),
  other: z.number().min(0),
})

// Total budget estimate schema
const totalBudgetEstimateSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().length(3),
  breakdown: budgetBreakdownSchema,
})

// Emergency info schema
const emergencyInfoSchema = z.object({
  emergencyNumber: z.string().min(1),
  embassy: z.string(),
  hospitals: z.array(z.string()),
})

// Main itinerary schema with fallbacks for optional AI-generated fields
const itinerarySchema = z.object({
  destination: z.string().min(1),
  duration: z.number().int().min(1).max(365),
  totalBudgetEstimate: totalBudgetEstimateSchema,
  days: z.array(daySchema).min(1),
  generalTips: z.array(z.string()).max(10).default([
    "Keep local emergency numbers handy",
    "Respect local customs and dress codes", 
    "Keep copies of important documents",
    "Stay hydrated and carry local currency"
  ]),
  emergencyInfo: emergencyInfoSchema.default({
    emergencyNumber: "911",
    embassy: "Contact your embassy for assistance",
    hospitals: ["Local Hospital", "Emergency Services"]
  }),
})

// Complete itinerary response schema
export const itineraryResponseSchema = z.object({
  itinerary: itinerarySchema,
})

// Quick itinerary schemas (simplified versions)
export const quickActivitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["attraction", "restaurant", "experience"]),
  timeSlot: z.enum(["morning", "afternoon", "evening"]),
  price: z.number().min(0),
  description: z.string().min(5),
})

export const quickDaySchema = z.object({
  day: z.number().int().min(1),
  activities: z.array(quickActivitySchema).min(1),
})

export const quickItinerarySchema = z.object({
  days: z.array(quickDaySchema).min(1),
  totalEstimate: z.number().min(0),
})

// Activity suggestion schemas
export const activitySuggestionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10),
  location: z.string().min(1),
  price: z.number().min(0),
  duration: z.string().min(1),
  tips: z.array(z.string()).max(3),
})

export const activitySuggestionsResponseSchema = z.object({
  suggestions: z.array(activitySuggestionSchema).min(1).max(5),
})

// Destination overview schemas
export const destinationHighlightSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["attraction", "experience", "area"]),
  description: z.string().min(10),
  averageVisitTime: z.string().min(1),
})

export const destinationOverviewSchema = z.object({
  destination: z.string().min(1),
  overview: z.object({
    description: z.string().min(20),
    bestTimeToVisit: z.string().min(10),
    currency: z.string().length(3),
    language: z.string().min(1),
    timeZone: z.string().min(1),
    climate: z.string().min(10),
  }),
  highlights: z.array(destinationHighlightSchema).max(10),
  practicalInfo: z.object({
    averageDailyBudget: z.object({
      budget: z.number().min(0),
      midRange: z.number().min(0),
      luxury: z.number().min(0),
    }),
    transportation: z.array(z.string()).max(5),
    culturalTips: z.array(z.string()).max(5),
    safety: z.string().min(10),
  }),
})

// Type exports
export type ItineraryResponse = z.infer<typeof itineraryResponseSchema>
export type Itinerary = z.infer<typeof itinerarySchema>
export type Day = z.infer<typeof daySchema>
export type Activity = z.infer<typeof activitySchema>
export type QuickItinerary = z.infer<typeof quickItinerarySchema>
export type ActivitySuggestion = z.infer<typeof activitySuggestionSchema>
export type DestinationOverview = z.infer<typeof destinationOverviewSchema>

// Validation functions
export function validateItinerary(data: unknown): {
  success: boolean
  data?: ItineraryResponse
  errors?: string[]
} {
  try {
    const validated = itineraryResponseSchema.parse(data)
    
    // Additional business logic validation
    const additionalErrors = validateBusinessRules(validated.itinerary)
    
    if (additionalErrors.length > 0) {
      return {
        success: false,
        errors: additionalErrors,
      }
    }
    
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => `${err.path.join('.')}: ${err.message}`),
      }
    }
    return {
      success: false,
      errors: ["Unknown validation error"],
    }
  }
}

export function validateQuickItinerary(data: unknown): {
  success: boolean
  data?: QuickItinerary
  errors?: string[]
} {
  try {
    const validated = quickItinerarySchema.parse(data)
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => `${err.path.join('.')}: ${err.message}`),
      }
    }
    return {
      success: false,
      errors: ["Unknown validation error"],
    }
  }
}

export function validateActivitySuggestions(data: unknown): {
  success: boolean
  data?: z.infer<typeof activitySuggestionsResponseSchema>
  errors?: string[]
} {
  try {
    const validated = activitySuggestionsResponseSchema.parse(data)
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => `${err.path.join('.')}: ${err.message}`),
      }
    }
    return {
      success: false,
      errors: ["Unknown validation error"],
    }
  }
}

// Business rules validation
function validateBusinessRules(itinerary: Itinerary): string[] {
  const errors: string[] = []

  // Check that days are sequential
  const sortedDays = itinerary.days.sort((a, b) => a.day - b.day)
  for (let i = 0; i < sortedDays.length; i++) {
    if (sortedDays[i].day !== i + 1) {
      errors.push(`Day ${sortedDays[i].day} is out of sequence`)
    }
  }

  // Check that duration matches number of days
  if (itinerary.duration !== itinerary.days.length) {
    errors.push(`Duration ${itinerary.duration} does not match number of days ${itinerary.days.length}`)
  }

  // Validate activity times within each day
  itinerary.days.forEach(day => {
    const sortedActivities = day.activities.sort((a, b) => a.startTime.localeCompare(b.startTime))
    
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i]
      const next = sortedActivities[i + 1]
      
      if (current.endTime > next.startTime) {
        errors.push(`Day ${day.day}: Activity "${current.name}" overlaps with "${next.name}"`)
      }
    }
  })

  // Validate budget consistency
  const totalFromBreakdown = Object.values(itinerary.totalBudgetEstimate.breakdown)
    .reduce((sum, amount) => sum + amount, 0)
  
  const difference = Math.abs(totalFromBreakdown - itinerary.totalBudgetEstimate.amount)
  if (difference > itinerary.totalBudgetEstimate.amount * 0.1) { // Allow 10% variance
    errors.push("Budget breakdown does not match total budget estimate")
  }

  // Validate coordinates are reasonable (not 0,0 unless it's accommodation-related or similar)
  itinerary.days.forEach(day => {
    day.activities.forEach(activity => {
      const { lat, lng } = activity.location.coordinates
      if (lat === 0 && lng === 0) {
        // Allow (0,0) coordinates for accommodation-related activities, meals at hotels, or generic activities
        const isAccommodationRelated = 
          activity.type === "accommodation" ||
          activity.name.toLowerCase().includes("hotel") ||
          activity.name.toLowerCase().includes("breakfast") ||
          activity.name.toLowerCase().includes("lunch") ||
          activity.name.toLowerCase().includes("dinner") ||
          activity.name.toLowerCase().includes("check-in") ||
          activity.name.toLowerCase().includes("check-out") ||
          activity.name.toLowerCase().includes("resort") ||
          activity.name.toLowerCase().includes("hostel") ||
          activity.name.toLowerCase().includes("guesthouse") ||
          activity.location.name.toLowerCase().includes("hotel") ||
          activity.location.name.toLowerCase().includes("resort") ||
          activity.location.address.toLowerCase().includes("hotel") ||
          activity.location.address.toLowerCase().includes("resort") ||
          activity.description.toLowerCase().includes("hotel") ||
          activity.description.toLowerCase().includes("accommodation")
        
        if (!isAccommodationRelated) {
          errors.push(`Day ${day.day}: Activity "${activity.name}" has invalid coordinates (0,0)`)
        }
      }
    })
  })

  return errors
}

// JSON parsing with error recovery
export function parseItineraryJSON(jsonString: string): {
  success: boolean
  data?: any
  errors?: string[]
  originalResponse?: string
} {
  // Clean the JSON string
  let cleanedJson = jsonString.trim()
  
  // Remove markdown code blocks if present
  cleanedJson = cleanedJson.replace(/```json\s?/g, '').replace(/```\s?/g, '')
  
  // Remove any leading/trailing text that's not JSON
  const firstBraceIndex = cleanedJson.indexOf('{')
  const firstBracketIndex = cleanedJson.indexOf('[')
  
  if (firstBraceIndex === -1 && firstBracketIndex === -1) {
    return {
      success: false,
      errors: ["No JSON structure found in response"],
      originalResponse: jsonString,
    }
  }
  
  const startIndex = firstBraceIndex !== -1 
    ? (firstBracketIndex !== -1 ? Math.min(firstBracketIndex, firstBraceIndex) : firstBraceIndex)
    : firstBracketIndex
  
  cleanedJson = cleanedJson.substring(startIndex)
  
  // Find the proper end of JSON by balancing brackets
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escaped = false
  let endIndex = -1
  
  for (let i = 0; i < cleanedJson.length; i++) {
    const char = cleanedJson[i]
    
    if (escaped) {
      escaped = false
      continue
    }
    
    if (char === '\\' && inString) {
      escaped = true
      continue
    }
    
    if (char === '"') {
      inString = !inString
      continue
    }
    
    if (!inString) {
      if (char === '{') braceCount++
      else if (char === '}') braceCount--
      else if (char === '[') bracketCount++
      else if (char === ']') bracketCount--
      
      // If we've balanced all brackets and braces, we found the end
      if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
        endIndex = i + 1
        break
      }
    }
  }
  
  if (endIndex !== -1) {
    cleanedJson = cleanedJson.substring(0, endIndex)
  }
  
  try {
    const parsed = JSON.parse(cleanedJson)
    return {
      success: true,
      data: parsed,
    }
  } catch (error) {
    // Enhanced JSON repair strategies
    try {
      let fixedJson = cleanedJson
      
      // 1. Fix trailing commas in objects and arrays
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1')
      
      // 2. Fix missing commas between array elements (objects)
      fixedJson = fixedJson.replace(/}(\s*){/g, '}, {')
      
      // 3. Fix missing commas between array elements (primitives)
      fixedJson = fixedJson.replace(/](\s*)\[/g, '], [')
      
      // 4. Fix missing commas between object properties
      fixedJson = fixedJson.replace(/"(\s*)\n(\s*)"/g, '",\n$2"')
      
      // 5. Fix missing commas after closing braces before new properties
      fixedJson = fixedJson.replace(/}(\s*)"[^"]*":/g, '},$1"')
      
      // 6. Balance brackets and braces if truncated
      const openBraces = (fixedJson.match(/{/g) || []).length
      const closeBraces = (fixedJson.match(/}/g) || []).length
      const openBrackets = (fixedJson.match(/\[/g) || []).length
      const closeBrackets = (fixedJson.match(/\]/g) || []).length
      
      // Add missing closing brackets/braces
      if (openBraces > closeBraces) {
        fixedJson += '}'.repeat(openBraces - closeBraces)
      }
      if (openBrackets > closeBrackets) {
        fixedJson += ']'.repeat(openBrackets - closeBrackets)
      }
      
      // 7. Try to fix incomplete array elements by removing the last incomplete element
      if (fixedJson.includes('},{') && !fixedJson.trim().endsWith('}')) {
        const lastCompleteObject = fixedJson.lastIndexOf('},{')
        if (lastCompleteObject !== -1) {
          const beforeLastObject = fixedJson.substring(0, lastCompleteObject + 1)
          // Check if we can close the array properly
          const openArrays = (beforeLastObject.match(/\[/g) || []).length
          const closeArrays = (beforeLastObject.match(/\]/g) || []).length
          
          if (openArrays > closeArrays) {
            fixedJson = beforeLastObject + ']'.repeat(openArrays - closeArrays)
          }
        }
      }
      
      const parsed = JSON.parse(fixedJson)
      return {
        success: true,
        data: parsed,
      }
    } catch (secondError) {
      // Last resort: Try to extract valid JSON segments
      try {
        // Look for complete JSON objects within the string
        const jsonObjects = []
        let currentObject = ''
        let braceLevel = 0
        let inString = false
        let escaped = false
        
        for (let i = 0; i < cleanedJson.length; i++) {
          const char = cleanedJson[i]
          
          if (escaped) {
            escaped = false
            currentObject += char
            continue
          }
          
          if (char === '\\' && inString) {
            escaped = true
            currentObject += char
            continue
          }
          
          if (char === '"') {
            inString = !inString
          }
          
          currentObject += char
          
          if (!inString) {
            if (char === '{') {
              braceLevel++
            } else if (char === '}') {
              braceLevel--
              if (braceLevel === 0 && currentObject.trim()) {
                try {
                  const obj = JSON.parse(currentObject.trim())
                  jsonObjects.push(obj)
                  currentObject = ''
                } catch {
                  // Continue trying
                }
              }
            }
          }
        }
        
        if (jsonObjects.length > 0) {
          // Return the first valid object found
          return {
            success: true,
            data: jsonObjects[0],
          }
        }
        
        throw new Error('No valid JSON objects found')
      } catch (thirdError) {
        return {
          success: false,
          errors: [
            `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            `Attempted fixes failed: ${secondError instanceof Error ? secondError.message : 'Unknown error'}`,
            `Final recovery attempt failed: ${thirdError instanceof Error ? thirdError.message : 'Unknown error'}`
          ],
          originalResponse: jsonString,
        }
      }
    }
  }
}

// Validation helper for API responses
export function validateAndParseItinerary(response: string): {
  success: boolean
  data?: ItineraryResponse
  errors?: string[]
  warnings?: string[]
} {
  // First parse the JSON
  const parseResult = parseItineraryJSON(response)
  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.errors,
    }
  }

  // Add missing fields with defaults if they're not present
  const processedData = parseResult.data
  if (processedData && processedData.itinerary) {
    // Add generalTips if missing
    if (!processedData.itinerary.generalTips) {
      processedData.itinerary.generalTips = [
        "Keep local emergency numbers handy",
        "Respect local customs and dress codes",
        "Keep copies of important documents",
        "Stay hydrated and carry local currency"
      ]
    }

    // Add emergencyInfo if missing
    if (!processedData.itinerary.emergencyInfo) {
      processedData.itinerary.emergencyInfo = {
        emergencyNumber: "911",
        embassy: "Contact your embassy for assistance",
        hospitals: ["Local Hospital", "Emergency Services"]
      }
    }
  }

  // Then validate the structure
  const validationResult = validateItinerary(processedData)
  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.errors,
    }
  }

  // Generate warnings for potential issues
  const warnings: string[] = []
  const itinerary = validationResult.data!.itinerary
  
  // Check for suspiciously low/high prices
  itinerary.days.forEach(day => {
    day.activities.forEach(activity => {
      if (activity.pricing.amount > 1000 && activity.pricing.priceType === "per_person") {
        warnings.push(`High price detected for "${activity.name}": ${activity.pricing.amount} ${activity.pricing.currency}`)
      }
    })
  })

  // Check for reasonable activity durations
  itinerary.days.forEach(day => {
    if (day.activities.length > 8) {
      warnings.push(`Day ${day.day} has many activities (${day.activities.length}), might be too packed`)
    }
  })

  return {
    success: true,
    data: validationResult.data,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}
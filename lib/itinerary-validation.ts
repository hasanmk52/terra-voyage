import { z } from "zod"

// Enhanced coordinate validation - reject obviously invalid coordinates
const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).refine((coords) => {
  // Reject default/invalid coordinates
  if (coords.lat === 0 && coords.lng === 0) {
    return false
  }
  
  // Reject coordinates that are too precise (likely AI hallucination)
  const latPrecision = coords.lat.toString().split('.')[1]?.length || 0
  const lngPrecision = coords.lng.toString().split('.')[1]?.length || 0
  
  if (latPrecision > 6 || lngPrecision > 6) {
    return false
  }
  
  return true
}, {
  message: "Coordinates must be valid and within reasonable precision (max 6 decimal places)"
})

// Enhanced location schema
const locationSchema = z.object({
  name: z.string()
    .min(3, "Location name must be at least 3 characters")
    .max(100, "Location name must not exceed 100 characters"),
  address: z.string()
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address must not exceed 200 characters"),
  coordinates: coordinatesSchema,
})

// Enhanced pricing schema with realistic cost validation
const pricingSchema = z.object({
  amount: z.number().min(0).max(10000), // Maximum $10,000 per activity
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  priceType: z.enum(["per_person", "per_group", "free"]),
}).refine((pricing) => {
  // Free activities should have 0 amount
  if (pricing.priceType === "free" && pricing.amount > 0) {
    return false
  }
  
  // Paid activities should have reasonable amounts
  if (pricing.priceType !== "free" && pricing.amount === 0) {
    return false
  }
  
  return true
}, {
  message: "Pricing amount must be consistent with price type"
})

// Accessibility schema
const accessibilitySchema = z.object({
  wheelchairAccessible: z.boolean(),
  hasElevator: z.boolean(),
  notes: z.string(),
})

// Enhanced activity name validation to reject generic names
const validateActivityName = (name: string): boolean => {
  const strictlyGenericNames = [
    'tourist attraction',
    'activity',
    'sightseeing',
    'explore',
    'visit',
    'restaurant', 
    'local food',
    'shopping',
    'experience',
    'attraction',
    'place to visit',
    'local restaurant',
    'local attraction',
    'tourist spot'
  ]
  
  // Check if name is exactly a generic name or very close
  const lowerName = name.toLowerCase().trim()
  
  // Reject if it's an exact match to generic names
  if (strictlyGenericNames.includes(lowerName)) {
    return false
  }
  
  // Reject if it starts with generic words and is very short
  if (strictlyGenericNames.some(generic => lowerName.startsWith(generic) && lowerName.length < generic.length + 5)) {
    return false
  }
  
  // Check for numbered generic activities
  if (/^(activity|attraction|restaurant|experience|place)\s*#?\d+$/i.test(name)) {
    return false
  }
  
  // Allow names that contain generic words but have specific details
  return true
}

// Activity schema with enhanced validation
const activitySchema = z.object({
  id: z.string().min(1),
  timeSlot: z.enum(["morning", "afternoon", "evening"]),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  name: z.string()
    .min(3, "Activity name must be at least 3 characters")
    .max(100, "Activity name must not exceed 100 characters")
    .refine(validateActivityName, {
      message: "Activity name is too generic. Please provide a specific venue or activity name."
    }),
  type: z.enum(["attraction", "restaurant", "experience", "transportation", "accommodation", "shopping"]),
  description: z.string()
    .min(20, "Activity description must be at least 20 characters")
    .max(500, "Activity description must not exceed 500 characters"),
  location: locationSchema,
  pricing: pricingSchema,
  duration: z.string()
    .regex(/^\d+\s*(minutes?|hours?|mins?|hrs?)$/i, "Duration must be in format like '120 minutes' or '2 hours'"),
  tips: z.array(z.string()).max(5),
  bookingRequired: z.boolean(),
  accessibility: accessibilitySchema,
}).refine((activity) => {
  // Validate duration is realistic (15 minutes to 8 hours)
  const durationMatch = activity.duration.match(/(\d+)\s*(minutes?|hours?|mins?|hrs?)/i)
  if (durationMatch) {
    const value = parseInt(durationMatch[1])
    const unit = durationMatch[2].toLowerCase()
    
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return value >= 0.25 && value <= 8 // 15 minutes to 8 hours
    } else {
      return value >= 15 && value <= 480 // 15 minutes to 8 hours
    }
  }
  return true
}, {
  message: "Activity duration must be between 15 minutes and 8 hours"
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

// Destination-specific coordinate validation
function validateDestinationCoordinates(destination: string, coordinates: { lat: number; lng: number }): boolean {
  // Define rough bounding boxes for major destinations (within ~100km radius)
  const destinationBounds: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    'paris': { minLat: 48.5, maxLat: 49.0, minLng: 2.0, maxLng: 2.7 },
    'london': { minLat: 51.2, maxLat: 51.8, minLng: -0.5, maxLng: 0.3 },
    'tokyo': { minLat: 35.4, maxLat: 35.9, minLng: 139.4, maxLng: 140.0 },
    'new york': { minLat: 40.4, maxLat: 41.0, minLng: -74.3, maxLng: -73.7 },
    'sydney': { minLat: -34.0, maxLat: -33.6, minLng: 150.8, maxLng: 151.4 },
    'rome': { minLat: 41.7, maxLat: 42.1, minLng: 12.3, maxLng: 12.7 },
    'barcelona': { minLat: 41.2, maxLat: 41.6, minLng: 1.9, maxLng: 2.4 },
    'amsterdam': { minLat: 52.2, maxLat: 52.5, minLng: 4.7, maxLng: 5.1 },
    'dubai': { minLat: 24.9, maxLat: 25.4, minLng: 54.9, maxLng: 55.6 },
    'singapore': { minLat: 1.2, maxLat: 1.5, minLng: 103.6, maxLng: 104.0 }
  }
  
  const destKey = destination.toLowerCase()
  
  // Check if we have bounds for this destination
  for (const [key, bounds] of Object.entries(destinationBounds)) {
    if (destKey.includes(key)) {
      const { lat, lng } = coordinates
      return lat >= bounds.minLat && lat <= bounds.maxLat && 
             lng >= bounds.minLng && lng <= bounds.maxLng
    }
  }
  
  // If no specific bounds, allow any valid coordinates
  return true
}

// Business rules validation with enhanced destination checking
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

  // Validate coordinates are reasonable and destination-relevant
  itinerary.days.forEach(day => {
    day.activities.forEach(activity => {
      const { lat, lng } = activity.location.coordinates
      
      // Check for invalid (0,0) coordinates  
      if (lat === 0 && lng === 0) {
        errors.push(`Day ${day.day}: Activity "${activity.name}" has invalid coordinates (0,0)`)
      } else {
        // Check if coordinates are within reasonable bounds for the destination
        if (!validateDestinationCoordinates(itinerary.destination, { lat, lng })) {
          errors.push(`Day ${day.day}: Activity "${activity.name}" coordinates (${lat}, ${lng}) appear to be outside the destination area of ${itinerary.destination}`)
        }
      }
    })
  })
  
  // Additional validation for destination relevance (only check obvious mismatches)
  itinerary.days.forEach(day => {
    day.activities.forEach(activity => {
      const destLower = itinerary.destination.toLowerCase()
      const addressLower = activity.location.address.toLowerCase()
      
      // Only flag obvious geographic mismatches in addresses (not venue names)
      // Focus on major cities that are clearly different destinations
      const majorCities = ['paris, france', 'london, uk', 'tokyo, japan', 'new york, usa', 'rome, italy', 'barcelona, spain', 'amsterdam, netherlands', 'dubai, uae', 'singapore', 'madrid, spain', 'berlin, germany']
      const obviousMismatches = majorCities.filter(city => {
        const cityName = city.split(',')[0].trim()
        return !destLower.includes(cityName) && addressLower.includes(city)
      })
      
      for (const mismatch of obviousMismatches) {
        const cityName = mismatch.split(',')[0].trim()
        errors.push(`Day ${day.day}: Activity "${activity.name}" address appears to be in ${cityName} instead of ${itinerary.destination}`)
      }
    })
  })

  return errors
}

// Enhanced JSON parsing with robust error recovery
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
    // Log the problematic JSON for debugging
    console.log('🔍 JSON parsing failed, attempting repair...')
    console.log('📍 Error:', error instanceof Error ? error.message : 'Unknown error')
    console.log('📝 Cleaned JSON length:', cleanedJson.length)
    
    // Show context around the error position if available
    if (error instanceof SyntaxError && error.message.includes('position')) {
      const positionMatch = error.message.match(/position (\d+)/)
      if (positionMatch) {
        const position = parseInt(positionMatch[1])
        const start = Math.max(0, position - 100)
        const end = Math.min(cleanedJson.length, position + 100)
        console.log('🎯 Context around error position:')
        console.log(`"${cleanedJson.substring(start, end)}"`)
        console.log(' '.repeat(Math.min(100, position - start)) + '^')
      }
    }
    
    // Enhanced JSON repair strategies with better truncation handling
    return attemptJSONRepair(cleanedJson, error, jsonString)
  }
}

// Comprehensive JSON repair function
function attemptJSONRepair(originalJson: string, originalError: any, fullResponse: string): {
  success: boolean
  data?: any
  errors?: string[]
  originalResponse?: string
} {
  const repairStrategies = [
    // Strategy 1: Fix common syntax issues and array element problems
    (json: string) => {
      let fixed = json
      
      // Fix trailing commas
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1')
      
      // Fix missing commas between array elements (objects)
      fixed = fixed.replace(/}(\s*){/g, '}, {')
      fixed = fixed.replace(/](\s*)\[/g, '], [')
      
      // Fix missing commas after closing braces/brackets in arrays
      fixed = fixed.replace(/}(\s*)\n(\s*){/g, '},\n$2{')
      fixed = fixed.replace(/}(\s*)([^,}\]\s])/g, '},$1$2')
      fixed = fixed.replace(/](\s*)([^,}\]\s])/g, '],$1$2')
      
      // Fix missing commas between object properties
      fixed = fixed.replace(/"(\s*)\n(\s*)"/g, '",\n$2"')
      fixed = fixed.replace(/}(\s*)"[^"]*":/g, '},$1"')
      
      // Fix specific array element issues - when object ends and new object starts
      fixed = fixed.replace(/}(\s*)"[^"]*"\s*:/g, '},\n  "$1":')
      
      return fixed
    },
    
    // Strategy 2: Specific array element comma fix
    (json: string) => {
      // This strategy specifically targets "Expected ',' or ']' after array element" errors
      let fixed = json
      
      // Critical fix: Missing comma between objects in arrays - most common case
      // Pattern: } followed by whitespace then { (new object in array)
      fixed = fixed.replace(/(\})(\s+)(\{)/g, '$1,$2$3')
      
      // Missing comma between array elements - } followed by ]
      fixed = fixed.replace(/(\})(\s*)(\])/g, '$1$2$3')
      
      // Look for patterns where array elements are missing commas
      // Pattern: ]} followed by non-comma, non-closing characters
      fixed = fixed.replace(/(\])(\s*)([^,\]\}\s])/g, '$1,$2$3')
      
      // Pattern: object ending followed by quote (start of next property) without comma
      fixed = fixed.replace(/(\})(\s*)(")/g, '$1,$2$3')
      
      // Pattern: array ending followed by quote (start of next property) without comma  
      fixed = fixed.replace(/(\])(\s*)(")/g, '$1,$2$3')
      
      // Pattern: number/boolean/null followed by quote without comma
      fixed = fixed.replace(/([\d}])(\s*)(")/g, '$1,$2$3')
      fixed = fixed.replace(/(true|false|null)(\s*)(")/g, '$1,$2$3')
      
      // Look for incomplete array elements and try to close them
      const lines = fixed.split('\n')
      const repairedLines = []
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        
        // If this line looks like it starts a new object/array element but previous line didn't end properly
        if (i > 0 && /^\s*["\{]/.test(line)) {
          const prevLine = repairedLines[repairedLines.length - 1]
          // If previous line doesn't end with comma, closing brace/bracket, or colon
          if (prevLine && !/[,\}\]\:](\s*)$/.test(prevLine)) {
            // Try to fix by adding comma to previous line
            repairedLines[repairedLines.length - 1] = prevLine + ','
          }
        }
        
        repairedLines.push(line)
      }
      
      return repairedLines.join('\n')
    },
    
    // Strategy 3: Context-aware property value repair
    (json: string) => {
      // This strategy handles "Expected ',' or '}' after property value" errors
      let fixed = json
      
      // Find the last complete object and try to close it properly
      const lines = fixed.split('\n')
      let foundError = false
      
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()
        
        // Look for lines that end with a property value but no comma/brace
        if (line.match(/^\s*"[^"]+"\s*:\s*[^,}]*$/)) {
          // This line has a property but no proper ending
          if (line.endsWith('"') || line.match(/\d+(\.\d+)?$/)) {
            // Check if we need a closing brace or comma
            const beforeLine = fixed.substring(0, fixed.indexOf(line))
            const openBraces = (beforeLine.match(/{/g) || []).length
            const closeBraces = (beforeLine.match(/}/g) || []).length
            
            if (openBraces > closeBraces && i === lines.length - 1) {
              // This is the last line and we need closing braces
              lines[i] = lines[i] + '\n' + '}'.repeat(openBraces - closeBraces)
            } else {
              lines[i] = lines[i] + ','
            }
            foundError = true
          }
        }
        
        // Look for incomplete objects at the end
        if (line.match(/^\s*}\s*$/) && i > 0) {
          const prevLine = lines[i - 1].trim()
          if (!prevLine.endsWith(',') && !prevLine.endsWith('{') && !prevLine.endsWith(':')) {
            // Previous line should probably end with comma
            if (prevLine.endsWith('"') || prevLine.match(/\d+(\.\d+)?$/)) {
              lines[i - 1] = lines[i - 1] + ','
              foundError = true
            }
          }
        }
      }
      
      // Try to balance unclosed structures
      const openBraces = (fixed.match(/{/g) || []).length
      const closeBraces = (fixed.match(/}/g) || []).length
      const openBrackets = (fixed.match(/\[/g) || []).length
      const closeBrackets = (fixed.match(/\]/g) || []).length
      
      fixed = lines.join('\n')
      
      if (openBraces > closeBraces) {
        fixed += '\n' + '}'.repeat(openBraces - closeBraces)
      }
      if (openBrackets > closeBrackets) {
        fixed += '\n' + ']'.repeat(openBrackets - closeBrackets)
      }
      
      return fixed
    },
    
    // Strategy 4: Targeted property value ending repair
    (json: string) => {
      // Handle specific case where property value is complete but missing comma/brace
      let fixed = json
      
      // Look for specific patterns like:
      // "currency": "USD"  <- missing comma or closing brace after this
      const propertyValuePattern = /("currency"\s*:\s*"[^"]*")(\s*)$/m
      const match = fixed.match(propertyValuePattern)
      
      if (match) {
        // Check if this appears to be the last property in an object
        const beforeMatch = fixed.substring(0, match.index)
        const openBraces = (beforeMatch.match(/{/g) || []).length
        const closeBraces = (beforeMatch.match(/}/g) || []).length
        
        if (openBraces > closeBraces) {
          // We're inside an object, need to close it
          fixed = fixed.replace(propertyValuePattern, '$1\n' + '}'.repeat(openBraces - closeBraces))
        }
      }
      
      // More generic pattern: any property value at end of string without proper closure
      const genericPattern = /("[\w]+"\s*:\s*(?:"[^"]*"|\d+(?:\.\d+)?|true|false|null))(\s*)$/
      const genericMatch = fixed.match(genericPattern)
      
      if (genericMatch) {
        const beforeMatch = fixed.substring(0, genericMatch.index)
        const openBraces = (beforeMatch.match(/{/g) || []).length
        const closeBraces = (beforeMatch.match(/}/g) || []).length
        const openBrackets = (beforeMatch.match(/\[/g) || []).length
        const closeBrackets = (beforeMatch.match(/\]/g) || []).length
        
        let closure = ''
        if (openBraces > closeBraces) {
          closure += '}'.repeat(openBraces - closeBraces)
        }
        if (openBrackets > closeBrackets) {
          closure += ']'.repeat(openBrackets - closeBrackets)
        }
        
        if (closure) {
          fixed = fixed.replace(genericPattern, '$1\n' + closure)
        }
      }
      
      return fixed
    },
    
    // Strategy 5: Handle truncated arrays and objects
    (json: string) => {
      let fixed = json
      
      // Count brackets and braces
      const openBraces = (fixed.match(/{/g) || []).length
      const closeBraces = (fixed.match(/}/g) || []).length
      const openBrackets = (fixed.match(/\[/g) || []).length
      const closeBrackets = (fixed.match(/\]/g) || []).length
      
      // If we have unbalanced brackets, try to close them
      if (openBraces > closeBraces) {
        fixed += '}'.repeat(openBraces - closeBraces)
      }
      if (openBrackets > closeBrackets) {
        fixed += ']'.repeat(openBrackets - closeBrackets)
      }
      
      return fixed
    },
    
    // Strategy 6: Remove incomplete trailing elements
    (json: string) => {
      let fixed = json
      
      // Handle unterminated strings first
      const stringMatches = fixed.match(/"[^"]*$/);
      if (stringMatches) {
        // Remove the unterminated string and any preceding comma
        fixed = fixed.replace(/,?\s*"[^"]*$/, '');
      }
      
      // Find the last complete object or array element
      const patterns = [
        /,\s*{\s*[^}]*$/,  // Incomplete object at end
        /,\s*\[\s*[^\]]*$/,  // Incomplete array at end
        /,\s*"[^"]*$/,     // Incomplete string at end
        /,\s*[^,}\]]*$/    // Incomplete value at end
      ]
      
      for (const pattern of patterns) {
        if (pattern.test(fixed)) {
          fixed = fixed.replace(pattern, '')
          break
        }
      }
      
      // Now balance brackets if needed
      const openBraces = (fixed.match(/{/g) || []).length
      const closeBraces = (fixed.match(/}/g) || []).length
      const openBrackets = (fixed.match(/\[/g) || []).length
      const closeBrackets = (fixed.match(/\]/g) || []).length
      
      if (openBraces > closeBraces) {
        fixed += '}'.repeat(openBraces - closeBraces)
      }
      if (openBrackets > closeBrackets) {
        fixed += ']'.repeat(openBrackets - closeBrackets)
      }
      
      return fixed
    },
    
    // Strategy 7: Extract the largest valid JSON object
    (json: string) => {
      // Try to find the main itinerary object
      const itineraryMatch = json.match(/{\s*"itinerary"\s*:\s*{.*?}(?:\s*,\s*[^}]*)?}\s*$/s)
      if (itineraryMatch) {
        let candidate = itineraryMatch[0]
        
        // Clean up any trailing incomplete parts
        candidate = candidate.replace(/,\s*[^}]*$/, '')
        
        // Balance brackets
        const openBraces = (candidate.match(/{/g) || []).length
        const closeBraces = (candidate.match(/}/g) || []).length
        
        if (openBraces > closeBraces) {
          candidate += '}'.repeat(openBraces - closeBraces)
        }
        
        return candidate
      }
      
      return json
    },
    
    // Strategy 8: Progressive character-by-character truncation
    (json: string) => {
      // Try removing characters from the end until we get valid JSON
      for (let i = json.length - 1; i >= Math.max(0, json.length - 1000); i--) {
        let candidate = json.substring(0, i)
        
        // Skip if we're in the middle of a string
        const quoteCount = (candidate.match(/"/g) || []).length
        if (quoteCount % 2 !== 0) {
          continue
        }
        
        // Try to balance and parse
        const openBraces = (candidate.match(/{/g) || []).length
        const closeBraces = (candidate.match(/}/g) || []).length
        const openBrackets = (candidate.match(/\[/g) || []).length
        const closeBrackets = (candidate.match(/\]/g) || []).length
        
        if (openBraces > closeBraces) {
          candidate += '}'.repeat(openBraces - closeBraces)
        }
        if (openBrackets > closeBrackets) {
          candidate += ']'.repeat(openBrackets - closeBrackets)
        }
        
        try {
          return JSON.parse(candidate)
        } catch {
          continue
        }
      }
      
      return json
    }
  ]
  
  // Try each repair strategy
  for (let i = 0; i < repairStrategies.length; i++) {
    try {
      console.log(`🔧 Attempting repair strategy ${i + 1}/${repairStrategies.length}`)
      const strategy = repairStrategies[i]
      const repairedJson = strategy(originalJson)
      const parsed = JSON.parse(repairedJson)
      
      console.log(`✅ JSON repair successful using strategy ${i + 1}`)
      return {
        success: true,
        data: parsed,
      }
    } catch (repairError) {
      console.log(`❌ Strategy ${i + 1} failed:`, repairError instanceof Error ? repairError.message : 'Unknown error')
      continue
    }
  }
  
  // If all strategies fail, try to extract any valid JSON objects
  try {
    const jsonObjects = extractValidJSONObjects(originalJson)
    if (jsonObjects.length > 0) {
      console.log(`✅ JSON extraction successful, found ${jsonObjects.length} valid objects`)
      return {
        success: true,
        data: jsonObjects[0], // Return the first valid object
      }
    }
  } catch (extractError) {
    // Continue to final error
  }
  
  // All repair attempts failed
  return {
    success: false,
    errors: [
      `JSON parsing failed: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`,
      `All repair strategies failed`,
      `Response may be severely truncated or malformed`
    ],
    originalResponse: fullResponse,
  }
}

// Helper function to extract valid JSON objects from malformed string
function extractValidJSONObjects(jsonString: string): any[] {
  const objects: any[] = []
  let braceLevel = 0
  let currentObject = ''
  let inString = false
  let escaped = false
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i]
    
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
            objects.push(obj)
            currentObject = ''
          } catch {
            // Continue trying
          }
        }
      }
    }
  }
  
  return objects
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
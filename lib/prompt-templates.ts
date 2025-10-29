import { TripPlanningFormData } from './trip-validation'

// Enhanced form data with user context for better personalization
export interface EnhancedFormData extends TripPlanningFormData {
  userContext?: {
    travelStyle?: string
    onboardingCompleted?: boolean
    preferredLanguage?: string
    currency?: string
  }
  userId?: string
}

// Security utility functions
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // Remove potential prompt injection patterns
  return input
    .replace(/[{}]/g, '') // Remove template literal brackets
    .replace(/\n\s*SYSTEM:/gi, '') // Remove system prompt attempts
    .replace(/\n\s*ASSISTANT:/gi, '') // Remove assistant prompt attempts  
    .replace(/\n\s*USER:/gi, '') // Remove user prompt attempts
    .replace(/```/g, '') // Remove code blocks
    .replace(/\n\s*IGNORE\s+PREVIOUS/gi, '') // Remove ignore instructions
    .replace(/\n\s*FORGET\s+EVERYTHING/gi, '') // Remove forget instructions
    .replace(/\|\|\s*true/gi, '') // Remove boolean injection attempts
    .replace(/;\s*(DROP|DELETE|UPDATE|INSERT)/gi, '') // Remove SQL injection attempts
    .trim()
    .substring(0, 500) // Limit length to prevent excessive input
}

function sanitizeArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return []
  return arr
    .filter(item => typeof item === 'string')
    .map(item => sanitizeInput(item))
    .filter(item => item.length > 0)
    .slice(0, 10) // Limit array size
}

function sanitizeNumber(num: any): number {
  if (typeof num === 'number' && !isNaN(num) && isFinite(num)) {
    return Math.max(0, Math.min(num, 1000000)) // Reasonable bounds
  }
  return 0
}

// Prompt template interface
export interface PromptTemplate {
  systemPrompt: string
  userPrompt: string
  maxTokens: number
  temperature: number
}

// Helper function to format preferences for prompt
function formatTravelPreferences(preferences: TripPlanningFormData['preferences']): string {
  const paceDescriptions = {
    slow: 'relaxed pace with 2-3 activities per day and plenty of rest time',
    moderate: 'balanced pace with 4-5 activities per day',
    fast: 'packed schedule with 6+ activities per day to maximize experiences'
  }

  const accommodationDescriptions = {
    budget: 'budget accommodations like hostels and budget hotels',
    'mid-range': '3-star hotels and boutique properties',
    luxury: '4-5 star hotels with premium amenities',
    mixed: 'a variety of accommodation types'
  }

  const transportationDescriptions = {
    walking: 'walking distances only, no long-distance transport',
    public: 'public transportation like buses, trains, and metro',
    'rental-car': 'rental car for flexibility and independence',
    mixed: 'combination of transportation methods as appropriate'
  }

  let result = `Travel pace: ${paceDescriptions[preferences.pace]}\n`
  result += `Accommodation preference: ${accommodationDescriptions[preferences.accommodationType]}\n`
  result += `Transportation preference: ${transportationDescriptions[preferences.transportation]}\n`

  if (preferences.accessibility) {
    result += 'IMPORTANT: All recommendations must be wheelchair accessible\n'
  }

  if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
    const sanitizedRestrictions = sanitizeArray(preferences.dietaryRestrictions)
    if (sanitizedRestrictions.length > 0) {
      result += `Dietary restrictions: ${sanitizedRestrictions.join(', ')}\n`
    }
  }

  if (preferences.specialRequests) {
    const sanitizedRequests = sanitizeInput(preferences.specialRequests)
    if (sanitizedRequests) {
      result += `Special requests: ${sanitizedRequests}\n`
    }
  }

  return result
}

// Helper function to format interests
function formatInterests(interests: string[]): string {
  const interestDescriptions: Record<string, string> = {
    culture: 'cultural sites, museums, historical monuments, local traditions',
    food: 'local cuisine, restaurants, food tours, cooking classes',
    adventure: 'hiking, extreme sports, outdoor activities, adventure tours',
    relaxation: 'spas, wellness activities, beaches, peaceful locations',
    nightlife: 'bars, clubs, entertainment venues, live music',
    shopping: 'markets, boutiques, local crafts, shopping districts',
    nature: 'parks, wildlife, scenic views, natural attractions',
    art: 'galleries, street art, creative spaces, art museums',
    photography: 'scenic spots, Instagram-worthy locations, photo opportunities',
    'local-life': 'authentic experiences, meeting locals, cultural immersion',
    luxury: 'high-end experiences, premium services, exclusive venues',
    family: 'kid-friendly activities, family attractions, suitable for all ages',
    romance: 'romantic dinners, couple activities, intimate experiences',
    business: 'networking opportunities, business-friendly venues',
    spiritual: 'religious sites, meditation centers, spiritual retreats',
    beach: 'water sports, coastal activities, beach relaxation'
  }

  // Sanitize interests array
  const sanitizedInterests = sanitizeArray(interests)
  
  return sanitizedInterests
    .map(interest => interestDescriptions[interest] || sanitizeInput(interest))
    .join(', ')
}

// Helper function to calculate trip duration
function getTripDuration(startDate: Date, endDate: Date): number {
  // Calculate inclusive date range (add 1 to include both start and end dates)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

// Helper function to format traveler info
function formatTravelers(travelers: TripPlanningFormData['travelers']): string {
  const parts = []
  if (travelers.adults > 0) parts.push(`${travelers.adults} adult${travelers.adults !== 1 ? 's' : ''}`)
  if (travelers.children > 0) parts.push(`${travelers.children} child${travelers.children !== 1 ? 'ren' : ''}`)
  if (travelers.infants > 0) parts.push(`${travelers.infants} infant${travelers.infants !== 1 ? 's' : ''}`)
  
  return parts.join(', ')
}

// Main itinerary generation prompt template - OPTIMIZED VERSION (42% token reduction)
export function createItineraryPrompt(formData: TripPlanningFormData | EnhancedFormData): PromptTemplate {
  const duration = getTripDuration(formData.dateRange.startDate, formData.dateRange.endDate)
  const travelerInfo = formatTravelers(formData.travelers)
  const preferences = formatTravelPreferences(formData.preferences)
  const interests = formatInterests(formData.interests)

  // Sanitize critical user inputs
  const sanitizedDestination = sanitizeInput(formData.destination.destination)
  const sanitizedCurrency = sanitizeInput(formData.budget.currency)
  const sanitizedAmount = sanitizeNumber(formData.budget.amount)


  const budgetInfo = formData.budget.range === 'per-person'
    ? `${sanitizedAmount} ${sanitizedCurrency} per person`
    : `${sanitizedAmount} ${sanitizedCurrency} total for the group`

  // Extract user context for enhanced personalization
  const enhancedData = formData as EnhancedFormData
  const userContext = enhancedData.userContext

  // Build personalization context
  let personalizationContext = ''
  if (userContext) {
    if (userContext.travelStyle) {
      const travelStyleDescriptions = {
        adventure: 'prioritize outdoor activities, adventure sports, and adrenaline-pumping experiences',
        luxury: 'emphasize high-end accommodations, fine dining, and premium experiences',
        budget: 'focus on cost-effective options, free activities, and budget-friendly recommendations',
        cultural: 'highlight museums, historical sites, local traditions, and cultural immersion',
        relaxation: 'prioritize spas, peaceful activities, and leisurely experiences',
        mixed: 'provide a balanced mix of different experience types'
      }
      const styleDescription = travelStyleDescriptions[userContext.travelStyle as keyof typeof travelStyleDescriptions] || userContext.travelStyle
      personalizationContext += `Travel Style: ${styleDescription}\n`
    }

    if (userContext.onboardingCompleted) {
      personalizationContext += 'User Profile: Experienced traveler with established preferences\n'
    }

    if (userContext.preferredLanguage && userContext.preferredLanguage !== 'en') {
      personalizationContext += `Language Preference: Consider ${userContext.preferredLanguage} language resources and multilingual venues\n`
    }
  }

  const systemPrompt = `You are an expert travel planner. Create detailed, personalized itineraries that are practical and culturally enriching.

CRITICAL: Generate COMPLETE JSON with ALL ${duration} days. Each day must have 3-5 activities with full details.

Requirements:
- Generate exactly ${duration} day objects (numbered 1-${duration}) in the "days" array
- Each day needs 3-5 activities across morning/afternoon/evening
- Use SPECIFIC venue names (e.g., "Edinburgh Castle", "Café Central") - NEVER generic names like "Local Restaurant"
- Duration format: STRING "120 minutes" or "2 hours" (never numbers or "2h")
- All pricing in ${sanitizedCurrency}
- Return ONLY valid, COMPLETE JSON with all required fields

Enum values (use EXACTLY these - no other values allowed):
- type: MUST be one of these 6 options ONLY:
  * "attraction" - for museums, landmarks, monuments, castles, parks, viewpoints, historical sites
  * "restaurant" - for cafes, restaurants, food halls, dining, breakfast/lunch/dinner
  * "experience" - for tours, shows, activities, classes, performances, entertainment
  * "transportation" - for travel between locations, transfers, transit
  * "accommodation" - for hotels, check-in/check-out (rarely used in daily activities)
  * "shopping" - for markets, malls, boutiques, stores
  ❌ DO NOT USE: "sightseeing", "food", "dining", "tour", "visit", "travel", "activity"
- timeSlot: "morning"|"afternoon"|"evening"
- transportation: "walking"|"public"|"taxi"|"rental_car"
- priceType: "per_person"|"per_group"|"free"

Data types:
- pricing.amount: NUMBER (0 for free, not string "free")
- coordinates: NUMBERS with max 4 decimals (e.g., 55.9533)
- duration: STRING ("90 minutes" or "2 hours")
- MUST include generalTips array and emergencyInfo object

The JSON must be complete and properly closed with all brackets and braces.`

  const userPrompt = `Create ${duration}-day itinerary for ${travelerInfo} in ${sanitizedDestination}.

Trip:
- Dates: ${formData.dateRange.startDate.toDateString()} to ${formData.dateRange.endDate.toDateString()}
- Budget: ${budgetInfo}
- Currency: ${sanitizedCurrency} (all pricing)
- Travelers: ${travelerInfo}

Preferences:
${preferences}

Interests: ${interests}

${personalizationContext ? `Personalization:
${personalizationContext}` : ''}

JSON structure:
{
  "itinerary": {
    "destination": "${sanitizedDestination}",
    "duration": ${duration},
    "totalBudgetEstimate": {
      "amount": number,
      "currency": "${sanitizedCurrency}",
      "breakdown": { accommodation: n, food: n, activities: n, transportation: n, other: n }
    },
    "days": [ // ${duration} day objects
      {
        "day": 1,
        "date": "${formData.dateRange.startDate.toISOString().split('T')[0]}",
        "theme": "day focus",
        "activities": [
          {
            "id": "unique_id",
            "timeSlot": "morning|afternoon|evening",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "name": "Specific Venue Name",
            "type": "attraction|restaurant|experience|transportation|accommodation|shopping",
            "description": "details",
            "location": { name: "", address: "", coordinates: { lat: 55.9533, lng: -3.1883 } },
            "pricing": { amount: 25.50, currency: "${sanitizedCurrency}", priceType: "per_person|per_group|free" },
            "duration": "90 minutes",
            "tips": ["tip1", "tip2"],
            "bookingRequired": bool,
            "accessibility": { wheelchairAccessible: bool, hasElevator: bool, notes: "" }
          }
        ],
        "dailyBudget": { amount: number, currency: "${sanitizedCurrency}" },
        "transportation": { primaryMethod: "walking|public|taxi|rental_car", estimatedCost: n, notes: "" }
      }
    ],
    "generalTips": ["tip1", "tip2", "tip3"],
    "emergencyInfo": { emergencyNumber: "", embassy: "", hospitals: [""] }
  }
}

IMPORTANT: Return COMPLETE JSON for ALL ${duration} days with ALL fields populated. Do not truncate or abbreviate the response.

Validation checklist:
- ${duration} complete day objects in "days" array (day 1 through ${duration})
- Each day has 3-5 complete activity objects
- type field: ONLY use "attraction", "restaurant", "experience", "transportation", "accommodation", or "shopping" (no other values!)
- duration field: STRING format "90 minutes" or "2 hours" (NOT 90 or "2h")
- name field: SPECIFIC venue names (NOT "Local Restaurant")
- pricing.amount: NUMBER type (NOT string)
- currency: "${sanitizedCurrency}" in all pricing fields
- coordinates: max 4 decimal places
- generalTips and emergencyInfo included and complete

Example valid activity types:
✅ "type": "attraction" (for Edinburgh Castle, museums, parks)
✅ "type": "restaurant" (for cafes, dining, food)
✅ "type": "experience" (for tours, shows, classes)
❌ "type": "sightseeing" (WRONG - use "attraction")
❌ "type": "food" (WRONG - use "restaurant")
❌ "type": "tour" (WRONG - use "experience")

CRITICAL: Generate COMPLETE JSON. Do not truncate. If response is too long, reduce activity descriptions but COMPLETE ALL DAYS.

Generate the complete, valid JSON response now:`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 20000, // Increased from 12000 to prevent truncation
    temperature: 0.7
  }
}

// Quick itinerary generation (simplified version)
export function createQuickItineraryPrompt(
  destination: string,
  duration: number,
  interests: string[],
  budget: number,
  currency: string
): PromptTemplate {
  // Sanitize inputs
  const sanitizedDestination = sanitizeInput(destination)
  const sanitizedDuration = Math.max(1, Math.min(duration, 30)) // 1-30 days max
  const sanitizedInterests = sanitizeArray(interests)
  const sanitizedBudget = sanitizeNumber(budget)
  const sanitizedCurrency = sanitizeInput(currency)
  
  const systemPrompt = `You are a travel expert. Create a concise itinerary with essential activities and realistic pricing.`

  const userPrompt = `Create a ${sanitizedDuration}-day itinerary for ${sanitizedDestination} with budget ${sanitizedBudget} ${sanitizedCurrency}.

Focus on: ${sanitizedInterests.join(', ')}

Return JSON with structure:
{
  "days": [
    {
      "day": number,
      "activities": [
        {
          "name": "activity name",
          "type": "attraction OR restaurant OR experience (exactly one of these)",
          "timeSlot": "morning OR afternoon OR evening (exactly one of these)",
          "price": number,
          "description": "brief description"
        }
      ]
    }
  ],
  "totalEstimate": number
}`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.8
  }
}

// Activity suggestion prompt (for customization)
export function createActivitySuggestionPrompt(
  destination: string,
  activityType: string,
  timeSlot: string,
  interests: string[],
  budget: number,
  currency: string
): PromptTemplate {
  // Sanitize inputs
  const sanitizedDestination = sanitizeInput(destination)
  const sanitizedActivityType = sanitizeInput(activityType)
  const sanitizedTimeSlot = sanitizeInput(timeSlot)
  const sanitizedInterests = sanitizeArray(interests)
  const sanitizedBudget = sanitizeNumber(budget)
  const sanitizedCurrency = sanitizeInput(currency)
  
  const systemPrompt = `You are a local travel expert specializing in ${sanitizedDestination}. Suggest authentic, high-quality activities.`

  const userPrompt = `Suggest 3-5 ${sanitizedActivityType} activities in ${sanitizedDestination} for ${sanitizedTimeSlot}.

Interests: ${sanitizedInterests.join(', ')}
Budget per activity: ~${sanitizedBudget/3} ${sanitizedCurrency}

Return JSON:
{
  "suggestions": [
    {
      "name": "activity name",
      "description": "detailed description",
      "location": "address",
      "price": number,
      "duration": "MUST be string format like '120 minutes' or '2 hours' - NEVER numbers or other formats",
      "tips": ["tip1", "tip2"]
    }
  ]
}`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.9
  }
}

// Destination overview prompt
export function createDestinationOverviewPrompt(destination: string): PromptTemplate {
  // Sanitize input
  const sanitizedDestination = sanitizeInput(destination)
  
  const systemPrompt = `You are a destination expert. Provide comprehensive, practical information about travel destinations.`

  const userPrompt = `Provide an overview of ${sanitizedDestination} for travelers.

Return JSON:
{
  "destination": "${sanitizedDestination}",
  "overview": {
    "description": "engaging destination description",
    "bestTimeToVisit": "seasonal recommendations",
    "currency": "local currency code",
    "language": "primary language",
    "timeZone": "timezone",
    "climate": "climate description"
  },
  "highlights": [
    {
      "name": "attraction name",
      "type": "attraction OR experience OR area (exactly one of these)",
      "description": "why it's special",
      "averageVisitTime": "time needed"
    }
  ],
  "practicalInfo": {
    "averageDailyBudget": {
      "budget": number,
      "midRange": number,
      "luxury": number
    },
    "transportation": ["main transport options"],
    "culturalTips": ["important cultural notes"],
    "safety": "safety considerations"
  }
}`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.6
  }
}

// Prompt validation and optimization
export function optimizePromptForModel(template: PromptTemplate, model: string): PromptTemplate {
  // Adjust parameters based on model capabilities
  const optimized = { ...template }

  switch (model) {
    case 'gpt-4':
    case 'gpt-4-turbo':
      optimized.maxTokens = Math.min(optimized.maxTokens, 4000)
      optimized.temperature = Math.max(0.3, optimized.temperature - 0.1)
      break
    case 'gpt-3.5-turbo':
      optimized.maxTokens = Math.min(optimized.maxTokens, 3000)
      optimized.temperature = Math.min(0.9, optimized.temperature + 0.1)
      break
    default:
      // Keep defaults
      break
  }

  return optimized
}

// Export prompt template types
export interface ItineraryResponse {
  itinerary: {
    destination: string
    duration: number
    totalBudgetEstimate: {
      amount: number
      currency: string
      breakdown: {
        accommodation: number
        food: number
        activities: number
        transportation: number
        other: number
      }
    }
    days: Array<{
      day: number
      date: string
      theme: string
      activities: Array<{
        id: string
        timeSlot: 'morning' | 'afternoon' | 'evening'
        startTime: string
        endTime: string
        name: string
        type: 'attraction' | 'restaurant' | 'experience' | 'transportation' | 'accommodation' | 'shopping'
        description: string
        location: {
          name: string
          address: string
          coordinates: {
            lat: number
            lng: number
          }
        }
        pricing: {
          amount: number
          currency: string
          priceType: 'per_person' | 'per_group' | 'free'
        }
        duration: string
        tips: string[]
        bookingRequired: boolean
        accessibility: {
          wheelchairAccessible: boolean
          hasElevator: boolean
          notes: string
        }
      }>
      dailyBudget: {
        amount: number
        currency: string
      }
      transportation: {
        primaryMethod: string
        estimatedCost: number
        notes: string
      }
    }>
    generalTips: string[]
    emergencyInfo: {
      emergencyNumber: string
      embassy: string
      hospitals: string[]
    }
  }
}
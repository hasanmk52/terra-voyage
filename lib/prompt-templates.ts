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

// Main itinerary generation prompt template
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

  const systemPrompt = `You are an expert travel planner with deep knowledge of destinations worldwide. Create detailed, personalized itineraries that are practical, culturally enriching, and budget-conscious.

CRITICAL: You MUST generate exactly ${duration} separate day objects in the "days" array. This is non-negotiable.

Key requirements:
- Generate exactly ${duration} days of activities (${duration} separate day objects in the days array)
- The "days" array MUST contain exactly ${duration} day objects numbered 1 through ${duration}
- Each day should have 3-5 activities distributed across morning, afternoon, and evening
- Include SPECIFIC venue names with ACTUAL establishment names (e.g., "Edinburgh Castle", "The Witchery by the Castle", "Café Central", "British Museum")
- NEVER use generic names like: "Local Restaurant", "Tourist Attraction", "Shopping Area", "Cultural Experience", "Sightseeing Tour"
- ALWAYS research and provide real, specific venue names that actually exist in the destination
- Provide realistic time estimates and travel time between activities
- Duration MUST be EXACTLY in format '120 minutes' or '2 hours' - NEVER just numbers like '120' or '2' or '2h' or '1.5 hours'
- Consider opening hours, seasonal availability, and local customs
- Balance must-see attractions with hidden gems and local experiences
- Include dining recommendations that fit the budget and dietary needs
- Suggest appropriate transportation between locations
- Ensure activities match the traveler group composition and interests

DATA TYPE REQUIREMENTS:
- All pricing amounts must be NUMBERS (e.g., 25.50, 0) NEVER strings (e.g., "25.50", "free")
- All coordinates must be NUMBERS with max 4 decimal places (e.g., 55.9533)
- All durations must be STRINGS in exact format (e.g., "2 hours", "120 minutes")

CRITICAL: Use only these exact enum values - DO NOT deviate or use variations:
- Activity types (MUST be exactly one of): "attraction", "restaurant", "experience", "transportation", "accommodation", "shopping"
  * Use "attraction" for museums, monuments, parks, viewpoints, landmarks
  * Use "restaurant" for dining, cafes, bars, food venues
  * Use "experience" for tours, shows, activities, cultural events
  * Use "transportation" for travel between locations
  * Use "accommodation" for hotels, check-in/out activities
  * Use "shopping" for markets, malls, souvenir shops
- Time slots: "morning", "afternoon", "evening"
- Transportation methods: "walking", "public", "taxi", "rental_car"
- Price types: "per_person", "per_group", "free"

Response format requirements:
- Return ONLY valid JSON, no additional text or markdown
- Use the exact structure specified in the user prompt
- Include realistic pricing in the specified currency (use NUMBER 0 for free activities, not string "free")
- Provide practical tips and cultural insights for each activity
- NEVER use values outside the specified enums
- ALWAYS include generalTips and emergencyInfo arrays - these are REQUIRED
- Ensure the JSON is complete and properly closed with all brackets and braces`

  const userPrompt = `Create a ${duration}-day itinerary for ${travelerInfo} visiting ${sanitizedDestination}.

IMPORTANT: You must create exactly ${duration} day objects in the "days" array - one for each day from ${formData.dateRange.startDate.toDateString()} to ${formData.dateRange.endDate.toDateString()}.

Trip Details:
- Dates: ${formData.dateRange.startDate.toDateString()} to ${formData.dateRange.endDate.toDateString()} (${duration} days total)
- Budget: ${budgetInfo}
- Travelers: ${travelerInfo}

Travel Preferences:
${preferences}

Interests: ${interests}

${personalizationContext ? `User Personalization:
${personalizationContext}` : ''}

Return a JSON object with this exact structure:
{
  "itinerary": {
    "destination": "${sanitizedDestination}",
    "duration": ${duration}, // MUST be NUMBER, NOT STRING
    "totalBudgetEstimate": {
      "amount": number,
      "currency": "${sanitizedCurrency}",
      "breakdown": {
        "accommodation": number,
        "food": number,
        "activities": number,
        "transportation": number,
        "other": number
      }
    },
    "days": [
      // REPEAT this object structure ${duration} times for days 1 through ${duration}
      {
        "day": 1, // increment for each day: 1, 2, 3, ..., ${duration}
        "date": "${formData.dateRange.startDate.toISOString().split('T')[0]}", // use sequential dates: ${formData.dateRange.startDate.toISOString().split('T')[0]}, then next day, etc.
        "theme": "brief description of the day's focus",
        "activities": [
          {
            "id": "unique_id",
            "timeSlot": "morning OR afternoon OR evening (exactly one of these)",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "name": "SPECIFIC Activity/Venue Name (e.g., 'Edinburgh Castle' NOT 'Visit Castle')",
            "type": "attraction OR restaurant OR experience OR transportation OR accommodation OR shopping (exactly one of these)",
            "description": "Detailed description with cultural context",
            "location": {
              "name": "Venue Name",
              "address": "Full address",
              "coordinates": {
                "lat": 55.9533, // NUMBER with EXACTLY 4 decimal places - NOT 55.95331234
                "lng": -3.1883  // NUMBER with EXACTLY 4 decimal places - NOT -3.18834567
              }
            },
            "pricing": {
              "amount": 25.50, // MUST be a NUMBER, not a string - use 0 for free activities
              "currency": "${sanitizedCurrency}",
              "priceType": "per_person OR per_group OR free (exactly one of these)"
            },
            "duration": "CRITICAL: MUST be STRING in EXACT format '90 minutes' or '2 hours' - NEVER use: numbers (120), short forms (2h, 90m), decimals (1.5 hours), ranges (2-3 hours), or other formats",
            "tips": [
              "practical tip 1",
              "practical tip 2"
            ],
            "bookingRequired": boolean,
            "accessibility": {
              "wheelchairAccessible": boolean,
              "hasElevator": boolean,
              "notes": "accessibility details"
            }
          }
        ],
        "dailyBudget": {
          "amount": number,
          "currency": "${sanitizedCurrency}"
        },
        "transportation": {
          "primaryMethod": "walking OR public OR taxi OR rental_car (exactly one of these)",
          "estimatedCost": number,
          "notes": "transportation tips for the day"
        }
      }
    ],
    "generalTips": [
      "practical travel tip 1",
      "cultural insight 1",
      "budget tip 1"
    ],
    "emergencyInfo": {
      "emergencyNumber": "local emergency number",
      "embassy": "embassy contact if applicable",
      "hospitals": ["nearby hospital names"]
    }
  }
}

Ensure all coordinates are accurate, prices are realistic for the destination and current year, and activities are appropriate for the specified travel dates and group composition.

CRITICAL VALIDATION REQUIREMENTS - THESE WILL CAUSE FAILURES IF NOT FOLLOWED:
- The "days" array MUST contain exactly ${duration} day objects (day 1, day 2, ..., day ${duration})
- The "duration" field MUST equal ${duration} and match the number of days in the "days" array
- EVERY activity "duration" MUST be STRING format: "120 minutes" or "2 hours" (NEVER numbers like 120, 2, or other formats like "2h", "1.5 hours")
- MANDATORY CURRENCY: ALL "currency" fields MUST be "${sanitizedCurrency}" (${budgetInfo}) - FAILURE TO USE CORRECT CURRENCY WILL CAUSE REJECTION
  ✓ CORRECT: "30 minutes", "90 minutes", "2 hours", "3 hours"
  ✗ WRONG: 30, 2, "2h", "1.5 hours", "2-3 hours", "half hour"
- EVERY activity "name" MUST be SPECIFIC venue names - Examples:
  ✓ CORRECT: "Edinburgh Castle", "The Witchery by the Castle", "Deacon's House Café"  
  ✗ WRONG: "Local Restaurant", "Tourist Attraction", "Cafe", "Historic Site", "Visit Castle"
- Every pricing "amount" MUST be a NUMBER (e.g., 25.50) NEVER a string (e.g., "25.50" or "free")
- ALL currency fields MUST use "${sanitizedCurrency}" - NEVER use "USD" or any other currency
- Every coordinate (lat/lng) MUST be a NUMBER with EXACTLY 4 decimal places (e.g., 55.9533, NOT 55.95331234 or 55.953312345678)
- Every "type" field must be exactly one of: "attraction", "restaurant", "experience", "transportation", "accommodation", "shopping"
- Every "timeSlot" field must be exactly one of: "morning", "afternoon", "evening"  
- Every "primaryMethod" field must be exactly one of: "walking", "public", "taxi", "rental_car"
- Every "priceType" field must be exactly one of: "per_person", "per_group", "free"
- Use ONLY these exact strings - no variations, typos, or alternatives
- MANDATORY: Include both "generalTips" array (3-5 practical travel tips) and complete "emergencyInfo" object
- The JSON must be complete and properly formatted with all closing brackets and braces

EXAMPLE: For a ${duration}-day trip from ${formData.dateRange.startDate.toISOString().split('T')[0]} to ${formData.dateRange.endDate.toISOString().split('T')[0]}, your "days" array should look like:
"days": [
  { "day": 1, "date": "${formData.dateRange.startDate.toISOString().split('T')[0]}", "theme": "Arrival and orientation", "activities": [...] },
  { "day": 2, "date": "${new Date(formData.dateRange.startDate.getTime() + 24*60*60*1000).toISOString().split('T')[0]}", "theme": "Cultural exploration", "activities": [...] },
  ${duration > 2 ? `{ "day": 3, "date": "${new Date(formData.dateRange.startDate.getTime() + 2*24*60*60*1000).toISOString().split('T')[0]}", "theme": "Local experiences", "activities": [...] },` : ''}
  ${duration > 3 ? '...' : ''}
  { "day": ${duration}, "date": "${formData.dateRange.endDate.toISOString().split('T')[0]}", "theme": "Final day activities", "activities": [...] }
]

YOU MUST CREATE ALL ${duration} DAY OBJECTS - NOT JUST 1 OR 2!

FINAL VALIDATION REMINDERS:
- ALL durations MUST be STRINGS: "90 minutes" NOT 90
- DURATION FORMAT EXAMPLES: Use exactly these patterns:
  ✓ "30 minutes", "45 minutes", "90 minutes", "120 minutes"
  ✓ "1 hour", "2 hours", "3 hours", "4 hours"  
  ✗ NEVER use: 30, 2, "2h", "1.5 hours", "2-3 hours"
- ALL activity names MUST be SPECIFIC venues: "The Royal Mile Tavern" NOT "Local Pub"
- These requirements will cause validation failures if not followed exactly!`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 12000,
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
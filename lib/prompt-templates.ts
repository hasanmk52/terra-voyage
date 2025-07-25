import { TripPlanningFormData } from './trip-validation'

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

  if (preferences.dietaryRestrictions.length > 0) {
    result += `Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}\n`
  }

  if (preferences.specialRequests) {
    result += `Special requests: ${preferences.specialRequests}\n`
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

  return interests
    .map(interest => interestDescriptions[interest] || interest)
    .join(', ')
}

// Helper function to calculate trip duration
function getTripDuration(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
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
export function createItineraryPrompt(formData: TripPlanningFormData): PromptTemplate {
  const duration = getTripDuration(formData.dateRange.startDate, formData.dateRange.endDate)
  const travelerInfo = formatTravelers(formData.travelers)
  const preferences = formatTravelPreferences(formData.preferences)
  const interests = formatInterests(formData.interests)
  
  const budgetInfo = formData.budget.range === 'per-person' 
    ? `${formData.budget.amount} ${formData.budget.currency} per person`
    : `${formData.budget.amount} ${formData.budget.currency} total for the group`

  const systemPrompt = `You are an expert travel planner with deep knowledge of destinations worldwide. Create detailed, personalized itineraries that are practical, culturally enriching, and budget-conscious.

Key requirements:
- Generate exactly ${duration} days of activities
- Each day should have 3-5 activities distributed across morning, afternoon, and evening
- Include specific venue names, addresses, and brief descriptions
- Provide realistic time estimates and travel time between activities
- Consider opening hours, seasonal availability, and local customs
- Balance must-see attractions with hidden gems and local experiences
- Include dining recommendations that fit the budget and dietary needs
- Suggest appropriate transportation between locations
- Ensure activities match the traveler group composition and interests

Response format requirements:
- Return ONLY valid JSON, no additional text
- Use the exact structure specified in the user prompt
- Include realistic pricing in the specified currency
- Provide practical tips and cultural insights for each activity`

  const userPrompt = `Create a ${duration}-day itinerary for ${travelerInfo} visiting ${formData.destination.destination}.

Trip Details:
- Dates: ${formData.dateRange.startDate.toDateString()} to ${formData.dateRange.endDate.toDateString()}
- Budget: ${budgetInfo}
- Travelers: ${travelerInfo}

Travel Preferences:
${preferences}

Interests: ${interests}

Return a JSON object with this exact structure:
{
  "itinerary": {
    "destination": "${formData.destination.destination}",
    "duration": ${duration},
    "totalBudgetEstimate": {
      "amount": number,
      "currency": "${formData.budget.currency}",
      "breakdown": {
        "accommodation": number,
        "food": number,
        "activities": number,
        "transportation": number,
        "other": number
      }
    },
    "days": [
      {
        "day": number,
        "date": "YYYY-MM-DD",
        "theme": "brief description of the day's focus",
        "activities": [
          {
            "id": "unique_id",
            "timeSlot": "morning|afternoon|evening",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "name": "Activity Name",
            "type": "attraction|restaurant|experience|transportation|accommodation",
            "description": "Detailed description with cultural context",
            "location": {
              "name": "Venue Name",
              "address": "Full address",
              "coordinates": {
                "lat": number,
                "lng": number
              }
            },
            "pricing": {
              "amount": number,
              "currency": "${formData.budget.currency}",
              "priceType": "per_person|per_group|free"
            },
            "duration": "estimated duration in minutes",
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
          "currency": "${formData.budget.currency}"
        },
        "transportation": {
          "primaryMethod": "walking|public|taxi|rental_car",
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

Ensure all coordinates are accurate, prices are realistic for the destination and current year, and activities are appropriate for the specified travel dates and group composition.`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
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
  const systemPrompt = `You are a travel expert. Create a concise itinerary with essential activities and realistic pricing.`

  const userPrompt = `Create a ${duration}-day itinerary for ${destination} with budget ${budget} ${currency}.

Focus on: ${interests.join(', ')}

Return JSON with structure:
{
  "days": [
    {
      "day": number,
      "activities": [
        {
          "name": "activity name",
          "type": "attraction|restaurant|experience",
          "timeSlot": "morning|afternoon|evening",
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
  const systemPrompt = `You are a local travel expert specializing in ${destination}. Suggest authentic, high-quality activities.`

  const userPrompt = `Suggest 3-5 ${activityType} activities in ${destination} for ${timeSlot}.

Interests: ${interests.join(', ')}
Budget per activity: ~${budget/3} ${currency}

Return JSON:
{
  "suggestions": [
    {
      "name": "activity name",
      "description": "detailed description",
      "location": "address",
      "price": number,
      "duration": "duration in minutes",
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
  const systemPrompt = `You are a destination expert. Provide comprehensive, practical information about travel destinations.`

  const userPrompt = `Provide an overview of ${destination} for travelers.

Return JSON:
{
  "destination": "${destination}",
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
      "type": "attraction|experience|area",
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
        type: 'attraction' | 'restaurant' | 'experience' | 'transportation' | 'accommodation'
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
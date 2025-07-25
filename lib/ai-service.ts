import { GoogleGenerativeAI } from '@google/generative-ai'
import { simulateDelay } from './mock-data'
import { useMockAI } from './selective-mocks'

// Mock AI responses for different types of requests
const mockAIResponses = {
  itinerary: {
    "type": "itinerary",
    "destination": "Paris, France",
    "duration": 5,
    "days": [
      {
        "day": 1,
        "title": "Arrival & Historic Paris",
        "activities": [
          {
            "time": "10:00",
            "title": "Arrive & Check-in",
            "description": "Settle into your accommodation and get oriented",
            "duration": 120,
            "type": "accommodation"
          },
          {
            "time": "14:00",
            "title": "Notre-Dame Cathedral",
            "description": "Explore the iconic Gothic cathedral and surrounding Île de la Cité",
            "duration": 90,
            "type": "sightseeing"
          },
          {
            "time": "16:30",
            "title": "Seine River Walk",
            "description": "Stroll along the Seine and enjoy views of historic Paris",
            "duration": 60,
            "type": "leisure"
          },
          {
            "time": "19:00",
            "title": "Traditional French Dinner",
            "description": "Experience authentic French cuisine at a local bistro",
            "duration": 120,
            "type": "dining"
          }
        ]
      },
      {
        "day": 2,
        "title": "Art & Culture",
        "activities": [
          {
            "time": "09:00",
            "title": "Louvre Museum",
            "description": "Visit the world's largest art museum, including the Mona Lisa",
            "duration": 180,
            "type": "museum"
          },
          {
            "time": "13:00",
            "title": "Lunch in Tuileries",
            "description": "Enjoy lunch with a view in the beautiful Tuileries Garden",
            "duration": 60,
            "type": "dining"
          },
          {
            "time": "15:00",
            "title": "Musée d'Orsay",
            "description": "Admire the world's finest collection of Impressionist art",
            "duration": 120,
            "type": "museum"
          },
          {
            "time": "18:00",
            "title": "Latin Quarter Evening",
            "description": "Explore the historic Latin Quarter and enjoy dinner",
            "duration": 180,
            "type": "leisure"
          }
        ]
      }
    ],
    "tips": [
      "Book museum tickets online in advance to skip the lines",
      "Try a traditional French breakfast at a local café",
      "Learn a few basic French phrases - locals appreciate the effort"
    ]
  },
  
  activities: [
    {
      "title": "Eiffel Tower Visit",
      "description": "Ascend the iconic Eiffel Tower for panoramic views of Paris",
      "duration": 120,
      "type": "sightseeing",
      "price_range": "€25-35",
      "best_time": "early morning or sunset"
    },
    {
      "title": "Seine River Cruise",
      "description": "Relaxing boat tour along the Seine with commentary",
      "duration": 60,
      "type": "leisure",
      "price_range": "€15-25",
      "best_time": "afternoon or evening"
    },
    {
      "title": "Montmartre Walking Tour",
      "description": "Explore the artistic district of Montmartre and Sacré-Cœur",
      "duration": 180,
      "type": "walking",
      "price_range": "€20-30",
      "best_time": "morning"
    }
  ],
  
  recommendations: {
    "destination": "Paris, France",
    "best_time_to_visit": "April-June or September-October",
    "recommended_duration": "4-7 days",
    "budget_estimate": {
      "budget": "€60-80/day",
      "mid_range": "€120-180/day",
      "luxury": "€300+/day"
    },
    "must_see": [
      "Eiffel Tower",
      "Louvre Museum",
      "Notre-Dame Cathedral",
      "Arc de Triomphe",
      "Montmartre"
    ],
    "local_tips": [
      "Metro day passes are cost-effective for sightseeing",
      "Many museums are free on the first Sunday of each month",
      "Dinner is typically served after 7:30 PM"
    ]
  }
}

// AI Service configuration
class AIService {
  private client: GoogleGenerativeAI | null = null
  private model: any = null
  private isInitialized = false

  constructor() {
    // Initialize client only when needed
  }

  private async initialize() {
    if (this.isInitialized) return

    // Skip initialization if using mocks
    if (useMockAI) {
      this.isInitialized = true
      return
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Gemini API key not configured')
    }

    this.client = new GoogleGenerativeAI(apiKey)
    this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' })

    this.isInitialized = true
  }

  async generateCompletion(
    prompt: string,
    options: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeout?: number
    } = {}
  ): Promise<string> {
    await this.initialize()

    // Use mock responses if mocks are enabled
    if (useMockAI) {
      await simulateDelay('ai')
      
      // Determine response type based on prompt content
      const promptLower = prompt.toLowerCase()
      
      if (promptLower.includes('itinerary') || promptLower.includes('plan') || promptLower.includes('schedule')) {
        return JSON.stringify(mockAIResponses.itinerary, null, 2)
      } else if (promptLower.includes('activity') || promptLower.includes('activities') || promptLower.includes('things to do')) {
        return JSON.stringify(mockAIResponses.activities, null, 2)
      } else if (promptLower.includes('recommend') || promptLower.includes('suggest') || promptLower.includes('advice')) {
        return JSON.stringify(mockAIResponses.recommendations, null, 2)
      } else if (promptLower.includes('ok') || promptLower.includes('health')) {
        return 'OK'
      } else {
        // Generic helpful response
        return 'Thank you for your query. I\'d be happy to help you plan your trip! Please provide more specific details about your destination, travel dates, and preferences so I can give you the best recommendations.'
      }
    }

    if (!this.model) {
      throw new Error('AI client not initialized')
    }

    const {
      maxTokens = 4000,
      temperature = 0.7,
      timeout = 30000,
    } = options

    try {
      // Create generation config
      const generationConfig = {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      }

      // Generate content with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`AI request timeout after ${timeout}ms`)), timeout)
      )

      const generatePromise = this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      })

      const result = await Promise.race([generatePromise, timeoutPromise])
      const response = await result.response
      const content = response.text()

      if (!content) {
        throw new Error('No content in AI response')
      }

      return content
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI generation failed: ${error.message}`)
      }
      throw new Error('Unknown AI generation error')
    }
  }

  async generateJSON<T>(
    prompt: string,
    options: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeout?: number
    } = {}
  ): Promise<T> {
    // Use mock responses if mocks are enabled
    if (useMockAI) {
      await simulateDelay('ai')
      
      const promptLower = prompt.toLowerCase()
      
      if (promptLower.includes('itinerary') || promptLower.includes('plan') || promptLower.includes('schedule')) {
        return mockAIResponses.itinerary as T
      } else if (promptLower.includes('activity') || promptLower.includes('activities') || promptLower.includes('things to do')) {
        return mockAIResponses.activities as T
      } else if (promptLower.includes('recommend') || promptLower.includes('suggest') || promptLower.includes('advice')) {
        return mockAIResponses.recommendations as T
      } else {
        // Return a generic JSON structure
        return {
          message: 'Mock AI response',
          status: 'success',
          data: {}
        } as T
      }
    }

    const jsonPrompt = `${prompt}

IMPORTANT: Return only valid JSON. No additional text or explanation.`

    const response = await this.generateCompletion(jsonPrompt, options)

    try {
      // Clean up response - remove code blocks if present
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanResponse) as T
    } catch (error) {
      throw new Error(`Invalid JSON response from AI: ${error}`)
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    latency?: number
    error?: string
  }> {
    // Always return healthy for mock mode
    if (useMockAI) {
      await simulateDelay('ai')
      return {
        status: 'healthy',
        latency: 150, // Simulated latency
      }
    }

    try {
      const startTime = Date.now()
      await this.generateCompletion('Say "OK" if you can respond.', {
        maxTokens: 10,
        timeout: 10000,
      })
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        latency,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Get usage statistics (if available)
  getUsageStats() {
    if (useMockAI) {
      return {
        requestCount: 42, // Mock statistics
        totalTokens: 15430,
        errors: 0,
        mode: 'mock'
      }
    }
    
    return {
      requestCount: 0, // Would track this in production
      totalTokens: 0, // Would track this in production
      errors: 0, // Would track this in production
      mode: 'live'
    }
  }
}

// Rate limiting and error handling wrapper
class RateLimitedAIService {
  private aiService: AIService
  private requestQueue: Array<{
    resolve: (value: any) => void
    reject: (error: any) => void
    request: () => Promise<any>
  }> = []
  private isProcessing = false
  private requestCount = 0
  private windowStart = Date.now()
  private readonly maxRequestsPerMinute = 60

  constructor() {
    this.aiService = new AIService()
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      // Check rate limit
      const now = Date.now()
      if (now - this.windowStart > 60000) {
        // Reset window
        this.windowStart = now
        this.requestCount = 0
      }

      if (this.requestCount >= this.maxRequestsPerMinute) {
        // Wait until next window
        const waitTime = 60000 - (now - this.windowStart)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      const { resolve, reject, request } = this.requestQueue.shift()!
      this.requestCount++

      try {
        const result = await request()
        resolve(result)
      } catch (error) {
        reject(error)
      }

      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.isProcessing = false
  }

  private enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, request })
      this.processQueue()
    })
  }

  async generateCompletion(
    prompt: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeout?: number
    }
  ): Promise<string> {
    return this.enqueueRequest(() =>
      this.aiService.generateCompletion(prompt, options)
    )
  }

  async generateJSON<T>(
    prompt: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeout?: number
    }
  ): Promise<T> {
    return this.enqueueRequest(() =>
      this.aiService.generateJSON<T>(prompt, options)
    )
  }

  async healthCheck() {
    return this.aiService.healthCheck()
  }

  getUsageStats() {
    return {
      ...this.aiService.getUsageStats(),
      queueLength: this.requestQueue.length,
      requestsThisMinute: this.requestCount,
    }
  }
}

// Export singleton instance
export const aiService = new RateLimitedAIService()

// Export types for use in other modules
export interface AIGenerationOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  timeout?: number
}

export interface AIHealthStatus {
  status: 'healthy' | 'unhealthy'
  latency?: number
  error?: string
}
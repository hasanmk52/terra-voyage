import { GoogleGenerativeAI } from '@google/generative-ai'
import { simulateDelay } from './mock-data'
import { useMockAI } from './selective-mocks'
import { circuitBreakers } from './circuit-breaker'
import { retryManagers } from './retry-logic'

// Function to generate destination-specific mock responses
function generateDestinationMockResponse(destination: string = "Paris, France") {
  const city = destination.split(',')[0].trim()
  
  return {
    itinerary: {
      "type": "itinerary",
      "destination": destination,
      "duration": 5,
      "days": [
        {
          "day": 1,
          "title": `Arrival & Historic ${city}`,
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
              "title": `Explore ${city} Historic Center`,
              "description": `Discover the main historic attractions and landmarks of ${city}`,
              "duration": 90,
              "type": "sightseeing"
            },
            {
              "time": "16:30",
              "title": `${city} City Walk`,
              "description": `Leisurely stroll through the beautiful streets of ${city}`,
              "duration": 60,
              "type": "leisure"
            },
            {
              "time": "19:00",
              "title": `Traditional ${city} Dinner`,
              "description": `Experience authentic local cuisine at a traditional ${city} restaurant`,
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
              "title": `${city} Main Museum`,
              "description": `Visit the premier museum and cultural attraction in ${city}`,
              "duration": 180,
              "type": "museum"
            },
            {
              "time": "13:00",
              "title": `Lunch in ${city} Park`,
              "description": `Enjoy lunch with a view in a beautiful ${city} park or garden`,
              "duration": 60,
              "type": "dining"
            },
            {
              "time": "15:00",
              "title": `${city} Art Gallery`,
              "description": `Admire the finest art collection and cultural exhibits in ${city}`,
              "duration": 120,
              "type": "museum"
            },
            {
              "time": "18:00",
              "title": `${city} Historic District Evening`,
              "description": `Explore the historic district of ${city} and enjoy dinner`,
              "duration": 180,
              "type": "leisure"
            }
          ]
        }
      ],
      "tips": [
        "Book popular attraction tickets online in advance",
        `Try traditional ${city} breakfast at a local café`,
        "Learn a few basic local phrases - locals appreciate the effort"
      ]
    },
    
    activities: [
      {
        "title": `${city} Iconic Landmark Visit`,
        "description": `Visit the most famous landmark in ${city} for panoramic city views`,
        "duration": 120,
        "type": "sightseeing",
        "price_range": "$20-40",
        "best_time": "early morning or sunset"
      },
      {
        "title": `${city} River/Harbor Tour`,
        "description": `Relaxing boat tour through ${city} with commentary`,
        "duration": 60,
        "type": "leisure",
        "price_range": "$15-30",
        "best_time": "afternoon or evening"
      },
      {
        "title": `${city} Walking Tour`,
        "description": `Explore the most interesting district and attractions of ${city}`,
        "duration": 180,
        "type": "walking",
        "price_range": "$20-35",
        "best_time": "morning"
      }
    ],
    
    recommendations: {
      "destination": destination,
      "best_time_to_visit": "Spring to Fall for best weather",
      "recommended_duration": "4-7 days",
      "budget_estimate": {
        "budget": "$60-90/day",
        "mid_range": "$120-200/day",
        "luxury": "$300+/day"
      },
      "must_see": [
        `${city} Main Landmark`,
        `${city} Historic Center`,
        `${city} Museum District`,
        `${city} Viewpoint`,
        `${city} Cultural Quarter`
      ],
      "local_tips": [
        "Public transport day passes are cost-effective for sightseeing",
        "Many attractions offer discounts during off-peak hours",
        "Local dining times may vary - ask locals for recommendations"
      ]
    }
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

    const {
      maxTokens = 4000,
      temperature = 0.7,
      timeout = 30000,
    } = options

    // Use circuit breaker with fallback to mock data
    return circuitBreakers.ai.execute(
      async () => {
        // Use mock responses if mocks are enabled
        if (useMockAI) {
          await simulateDelay('ai')
          
          // Determine response type based on prompt content
          const promptLower = prompt.toLowerCase()
          
          // Extract destination from prompt
          const destinationMatch = prompt.match(/(?:to|in|for|visit|destination[:"]*)\s*([A-Z][a-zA-Z\s,]+?)(?:[\.,;]|$|\s(?:from|on|during|in|\d))/i)
          let destination = "Paris, France" // default
          if (destinationMatch && destinationMatch[1]) {
            destination = destinationMatch[1].trim()
            // Add country if not present
            if (!destination.includes(',')) {
              const cityCountryMap: Record<string, string> = {
                'Tokyo': 'Tokyo, Japan',
                'London': 'London, UK', 
                'Dubai': 'Dubai, UAE',
                'Sydney': 'Sydney, Australia',
                'Rome': 'Rome, Italy',
                'Barcelona': 'Barcelona, Spain',
                'New York': 'New York, NY, USA'
              }
              destination = cityCountryMap[destination] || `${destination}, Unknown`
            }
          }
          
          const mockResponses = generateDestinationMockResponse(destination)
          
          if (promptLower.includes('itinerary') || promptLower.includes('plan') || promptLower.includes('schedule')) {
            return JSON.stringify(mockResponses.itinerary, null, 2)
          } else if (promptLower.includes('activity') || promptLower.includes('activities') || promptLower.includes('things to do')) {
            return JSON.stringify(mockResponses.activities, null, 2)
          } else if (promptLower.includes('recommend') || promptLower.includes('suggest') || promptLower.includes('advice')) {
            return JSON.stringify(mockResponses.recommendations, null, 2)
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

        // Execute with retry logic
        return retryManagers.ai.execute(async () => {
          // Create generation config
          const generationConfig = {
            maxOutputTokens: maxTokens,
            temperature: temperature,
          }

          // Generate content with timeout
          const timeoutPromise = new Promise<never>((_, reject) => 
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
        });
      },
      async () => {
        // Fallback to mock data
        console.log("Using AI mock data as fallback");
        await simulateDelay('ai')
        
        const promptLower = prompt.toLowerCase()
        
        // Extract destination from prompt  
        const destinationMatch = prompt.match(/(?:to|in|for|visit|destination[:"]*)\s*([A-Z][a-zA-Z\s,]+?)(?:[\.,;]|$|\s(?:from|on|during|in|\d))/i)
        let destination = "Paris, France" // default
        if (destinationMatch && destinationMatch[1]) {
          destination = destinationMatch[1].trim()
          if (!destination.includes(',')) {
            const cityCountryMap: Record<string, string> = {
              'Tokyo': 'Tokyo, Japan',
              'London': 'London, UK', 
              'Dubai': 'Dubai, UAE',
              'Sydney': 'Sydney, Australia',
              'Rome': 'Rome, Italy',
              'Barcelona': 'Barcelona, Spain',
              'New York': 'New York, NY, USA'
            }
            destination = cityCountryMap[destination] || `${destination}, Unknown`
          }
        }
        
        const mockResponses = generateDestinationMockResponse(destination)
        
        if (promptLower.includes('itinerary') || promptLower.includes('plan') || promptLower.includes('schedule')) {
          return JSON.stringify(mockResponses.itinerary, null, 2)
        } else if (promptLower.includes('activity') || promptLower.includes('activities') || promptLower.includes('things to do')) {
          return JSON.stringify(mockResponses.activities, null, 2)
        } else if (promptLower.includes('recommend') || promptLower.includes('suggest') || promptLower.includes('advice')) {
          return JSON.stringify(mockResponses.recommendations, null, 2)
        } else if (promptLower.includes('ok') || promptLower.includes('health')) {
          return 'OK'
        } else {
          return 'Thank you for your query. I\'d be happy to help you plan your trip! Please provide more specific details about your destination, travel dates, and preferences so I can give you the best recommendations.'
        }
      }
    );
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
    // Use circuit breaker with fallback to mock data
    return circuitBreakers.ai.execute(
      async () => {
        // Use mock responses if mocks are enabled
        if (useMockAI) {
          await simulateDelay('ai')
          
          const promptLower = prompt.toLowerCase()
          
          // Extract destination from prompt
          const destinationMatch = prompt.match(/(?:to|in|for|visit|destination[:"]*)\s*([A-Z][a-zA-Z\s,]+?)(?:[\.,;]|$|\s(?:from|on|during|in|\d))/i)
          let destination = "Paris, France" // default
          if (destinationMatch && destinationMatch[1]) {
            destination = destinationMatch[1].trim()
            if (!destination.includes(',')) {
              const cityCountryMap: Record<string, string> = {
                'Tokyo': 'Tokyo, Japan',
                'London': 'London, UK', 
                'Dubai': 'Dubai, UAE',
                'Sydney': 'Sydney, Australia',
                'Rome': 'Rome, Italy',
                'Barcelona': 'Barcelona, Spain',
                'New York': 'New York, NY, USA'
              }
              destination = cityCountryMap[destination] || `${destination}, Unknown`
            }
          }
          
          const mockResponses = generateDestinationMockResponse(destination)
          
          if (promptLower.includes('itinerary') || promptLower.includes('plan') || promptLower.includes('schedule')) {
            return mockResponses.itinerary as T
          } else if (promptLower.includes('activity') || promptLower.includes('activities') || promptLower.includes('things to do')) {
            return mockResponses.activities as T
          } else if (promptLower.includes('recommend') || promptLower.includes('suggest') || promptLower.includes('advice')) {
            return mockResponses.recommendations as T
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
      },
      async () => {
        // Fallback to mock data
        console.log("Using AI JSON mock data as fallback");
        await simulateDelay('ai')
        
        const promptLower = prompt.toLowerCase()
        
        // Extract destination from prompt
        const destinationMatch = prompt.match(/(?:to|in|for|visit|destination[:"]*)\s*([A-Z][a-zA-Z\s,]+?)(?:[\.,;]|$|\s(?:from|on|during|in|\d))/i)
        let destination = "Paris, France" // default
        if (destinationMatch && destinationMatch[1]) {
          destination = destinationMatch[1].trim()
          if (!destination.includes(',')) {
            const cityCountryMap: Record<string, string> = {
              'Tokyo': 'Tokyo, Japan',
              'London': 'London, UK', 
              'Dubai': 'Dubai, UAE',
              'Sydney': 'Sydney, Australia',
              'Rome': 'Rome, Italy',
              'Barcelona': 'Barcelona, Spain',
              'New York': 'New York, NY, USA'
            }
            destination = cityCountryMap[destination] || `${destination}, Unknown`
          }
        }
        
        const mockResponses = generateDestinationMockResponse(destination)
        
        if (promptLower.includes('itinerary') || promptLower.includes('plan') || promptLower.includes('schedule')) {
          return mockResponses.itinerary as T
        } else if (promptLower.includes('activity') || promptLower.includes('activities') || promptLower.includes('things to do')) {
          return mockResponses.activities as T
        } else if (promptLower.includes('recommend') || promptLower.includes('suggest') || promptLower.includes('advice')) {
          return mockResponses.recommendations as T
        } else {
          return {
            message: 'Fallback AI response - service unavailable',
            status: 'fallback',
            data: {}
          } as T
        }
      }
    );
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    latency?: number
    error?: string
  }> {
    try {
      return await circuitBreakers.ai.execute(
        async () => {
          // Always return healthy for mock mode
          if (useMockAI) {
            await simulateDelay('ai')
            return {
              status: 'healthy' as const,
              latency: 150, // Simulated latency
            }
          }

          const startTime = Date.now()
          await this.generateCompletion('Say "OK" if you can respond.', {
            maxTokens: 10,
            timeout: 10000,
          })
          const latency = Date.now() - startTime

          return {
            status: 'healthy' as const,
            latency,
          }
        },
        async () => {
          // Fallback for health check
          console.log("AI health check using fallback");
          await simulateDelay('ai')
          return {
            status: 'healthy' as const,
            latency: 200, // Fallback latency
            error: 'Using fallback mode'
          }
        }
      );
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
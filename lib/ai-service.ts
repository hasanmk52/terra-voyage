import { GoogleGenerativeAI } from '@google/generative-ai'
import { circuitBreakers } from './circuit-breaker'
import { retryManagers } from './retry-logic'


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

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.')
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
      timeout = 120000, // Increase to 2 minutes - don't artificially limit AI
    } = options

    if (!this.model) {
      throw new Error('AI client not initialized - model is null')
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

      try {
        const result = await Promise.race([generatePromise, timeoutPromise])
        const response = await result.response
        const content = response.text()

        if (!content) {
          throw new Error('AI returned empty response - no content generated')
        }

        console.log(`✅ AI generated ${content.length} characters`)
        return content
      } catch (error) {
        // Provide detailed error information
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            throw new Error(`AI request timed out after ${timeout}ms. The AI service may be overloaded. Try again in a few minutes.`)
          }
          if (error.message.includes('quota')) {
            throw new Error(`AI service quota exceeded. Please check your API key limits or try again later.`)
          }
          if (error.message.includes('rate')) {
            throw new Error(`AI service rate limit hit. Please wait a moment before trying again.`)
          }
          if (error.message.includes('key')) {
            throw new Error(`AI service authentication failed. Please check your GEMINI_API_KEY is valid.`)
          }
          throw new Error(`AI service error: ${error.message}`)
        }
        throw new Error(`Unknown AI service error: ${error}`)
      }
    });
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
    const jsonPrompt = `${prompt}

IMPORTANT: Return only valid JSON. No additional text or explanation.`

    const response = await this.generateCompletion(jsonPrompt, options)

    try {
      // Clean up response - remove code blocks if present
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks more aggressively
      cleanResponse = cleanResponse
        .replace(/^```json\s*/i, '')  // Start of json code block
        .replace(/^```\s*/i, '')      // Start of generic code block
        .replace(/\s*```\s*$/i, '')   // End of code block
        .replace(/^\s*```json\s*/gim, '')  // Multiple json blocks
        .replace(/^\s*```\s*/gim, '')      // Multiple generic blocks
        .replace(/\s*```\s*$/gim, '')      // Multiple end blocks
        .trim()

      // Also try to find JSON content between any remaining backticks
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanResponse = jsonMatch[0]
      }

      return JSON.parse(cleanResponse) as T
    } catch (error) {
      console.error('JSON parsing failed:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Cleaned response (first 500 chars):', response.substring(0, 500))
      throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    latency?: number
    error?: string
  }> {
    try {
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
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Get usage statistics (if available)
  getUsageStats() {
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
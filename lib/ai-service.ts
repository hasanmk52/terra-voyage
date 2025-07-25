import OpenAI from 'openai'

// AI Service configuration
class AIService {
  private client: OpenAI | null = null
  private isInitialized = false

  constructor() {
    // Initialize client only when needed
  }

  private async initialize() {
    if (this.isInitialized) return

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    this.client = new OpenAI({
      apiKey,
    })

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

    if (!this.client) {
      throw new Error('AI client not initialized')
    }

    const {
      model = 'gpt-4o-mini',
      maxTokens = 4000,
      temperature = 0.7,
      timeout = 30000,
    } = options

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const completion = await this.client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature,
        },
        {
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in AI response')
      }

      return content
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`AI request timeout after ${timeout}ms`)
        }
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
    return {
      requestCount: 0, // Would track this in production
      totalTokens: 0, // Would track this in production
      errors: 0, // Would track this in production
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
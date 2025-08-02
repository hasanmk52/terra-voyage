import { TripPlanningFormData } from './trip-validation'
import { 
  ItineraryResponse, 
  validateAndParseItinerary,
  QuickItinerary,
  validateQuickItinerary 
} from './itinerary-validation'
import { aiService } from './ai-service'
import { cacheService, generateCacheKey } from './cache-service'
// Fallback handling removed - no more mock data
import { budgetCalculator } from './budget-calculator'
import { 
  createItineraryPrompt, 
  createQuickItineraryPrompt,
  optimizePromptForModel 
} from './prompt-templates'

// Performance monitoring interface
export interface PerformanceMetrics {
  totalTime: number
  cacheHit: boolean
  aiGenerationTime?: number
  validationTime?: number
  fallbackUsed: boolean
  optimizationsApplied: string[]
}

// Generation options
export interface GenerationOptions {
  useCache?: boolean
  maxTimeout?: number
  fallbackOnTimeout?: boolean
  prioritizeSpeed?: boolean
  model?: string
}

// Result interface
export interface ItineraryResult {
  itinerary: ItineraryResponse
  performance: PerformanceMetrics
  warnings?: string[]
  metadata: {
    generatedAt: Date
    generationMethod: 'ai' | 'fallback' | 'cache'
    quality: 'high' | 'medium' | 'low'
    estimatedAccuracy: number
  }
}

export class ItineraryService {
  private readonly DEFAULT_TIMEOUT = 180000 // 3 minutes for complex itinerary generation - no artificial limits
  private readonly QUICK_TIMEOUT = 90000 // 1.5 minutes for quick generation
  private readonly CACHE_TTL = 86400 // 24 hours

  async generateItinerary(
    formData: TripPlanningFormData,
    options: GenerationOptions = {}
  ): Promise<ItineraryResult> {
    const startTime = Date.now()
    const {
      useCache = true,
      maxTimeout = this.DEFAULT_TIMEOUT,
      fallbackOnTimeout = true,
      prioritizeSpeed = false,
      model = 'gpt-4o-mini'
    } = options

    const optimizationsApplied: string[] = []
    const cacheKey = generateCacheKey(formData)

    try {
      // 1. Check cache first
      if (useCache) {
        const cached = await cacheService.getItinerary(cacheKey)
        if (cached) {
          optimizationsApplied.push('cache-hit')
          return {
            itinerary: cached,
            performance: {
              totalTime: Date.now() - startTime,
              cacheHit: true,
              fallbackUsed: false,
              optimizationsApplied
            },
            metadata: {
              generatedAt: new Date(),
              generationMethod: 'cache',
              quality: 'high',
              estimatedAccuracy: 95
            }
          }
        }
      }

      // 2. Determine generation strategy based on speed priority
      let itinerary: ItineraryResponse
      let aiGenerationTime = 0
      let validationTime = 0
      let fallbackUsed = false

      if (prioritizeSpeed) {
        // Use quick generation for speed
        console.log('🚀 ItineraryService: Using quick generation for speed')
        optimizationsApplied.push('quick-generation')
        const result = await this.generateQuickItinerary(formData, maxTimeout / 2, model)
        itinerary = this.convertQuickToFullItinerary(result, formData)
        aiGenerationTime = Date.now() - startTime
        console.log('✅ ItineraryService: Quick generation completed')
      } else {
        // Use full generation with timeout handling
        try {
          console.log('📝 ItineraryService: Starting full AI generation')
          const aiStartTime = Date.now()
          itinerary = await this.generateFullItinerary(formData, maxTimeout, model)
          aiGenerationTime = Date.now() - aiStartTime
          optimizationsApplied.push('full-ai-generation')
          console.log('✅ ItineraryService: AI generation completed successfully')
        } catch (error) {
          console.error('❌ ItineraryService: AI generation failed:', error instanceof Error ? error.message : 'Unknown error')
          // Don't use fallbacks - throw the error so we can fix the AI service properly
          throw error
        }
      }

      // 3. Validate and optimize
      const validationStartTime = Date.now()
      const quality = this.assessItineraryQuality(itinerary, formData)
      validationTime = Date.now() - validationStartTime

      // 4. Apply budget optimizations if needed
      const budgetValidation = budgetCalculator.validateBudget(formData)
      if (!budgetValidation.isRealistic && budgetValidation.differencePercentage < -20) {
        const optimizedResult = budgetCalculator.optimizeItineraryBudget(
          itinerary, 
          formData.budget.amount
        )
        itinerary = optimizedResult.optimizedItinerary
        optimizationsApplied.push('budget-optimization')
      }

      // 5. Cache the result
      if (useCache && !fallbackUsed) {
        await cacheService.setItinerary(cacheKey, itinerary)
      }

      const totalTime = Date.now() - startTime

      return {
        itinerary,
        performance: {
          totalTime,
          cacheHit: false,
          aiGenerationTime: aiGenerationTime > 0 ? aiGenerationTime : undefined,
          validationTime,
          fallbackUsed,
          optimizationsApplied
        },
        warnings: budgetValidation.recommendations,
        metadata: {
          generatedAt: new Date(),
          generationMethod: fallbackUsed ? 'fallback' : 'ai',
          quality: quality.overall,
          estimatedAccuracy: quality.accuracy
        }
      }

    } catch (error) {
      // Don't use fallbacks - throw the error and fix the root cause
      console.error('❌ ItineraryService: Failed to generate itinerary:', error)
      throw error
    }
  }

  // Generate full itinerary using AI
  private async generateFullItinerary(
    formData: TripPlanningFormData,
    timeout: number,
    model: string
  ): Promise<ItineraryResponse> {
    try {
      console.log('📝 ItineraryService: Creating prompt template')
      const promptTemplate = createItineraryPrompt(formData)
      console.log('📝 ItineraryService: Optimizing prompt for model')
      const optimizedPrompt = optimizePromptForModel(promptTemplate, model)

      console.log('📝 ItineraryService: Calling AI service generateCompletion')
      const response = await aiService.generateCompletion(
        `${optimizedPrompt.systemPrompt}\n\n${optimizedPrompt.userPrompt}`,
        {
          model,
          maxTokens: optimizedPrompt.maxTokens,
          temperature: optimizedPrompt.temperature,
          timeout
        }
      )

      console.log('📝 ItineraryService: Validating and parsing AI response')
      const parseResult = validateAndParseItinerary(response)
      if (!parseResult.success) {
        throw new Error(`Itinerary validation failed: ${parseResult.errors?.join(', ')}`)
      }

      console.log('✅ ItineraryService: Full itinerary generation successful')
      return parseResult.data!
    } catch (error) {
      console.error('❌ ItineraryService: Error in generateFullItinerary:', error)
      throw error
    }
  }

  // Generate quick itinerary using AI (simplified version)
  private async generateQuickItinerary(
    formData: TripPlanningFormData,
    timeout: number,
    model: string
  ): Promise<QuickItinerary> {
    console.log('🚀 ItineraryService: generateQuickItinerary called for', formData.destination.destination)
    
    const duration = Math.ceil(
      (formData.dateRange.endDate.getTime() - formData.dateRange.startDate.getTime()) / 
      (1000 * 60 * 60 * 24)
    )

    const promptTemplate = createQuickItineraryPrompt(
      formData.destination.destination,
      duration,
      formData.interests,
      formData.budget.amount,
      formData.budget.currency
    )

    console.log('🚀 ItineraryService: Calling aiService.generateCompletion for quick itinerary')
    const response = await aiService.generateCompletion(
      `${promptTemplate.systemPrompt}\n\n${promptTemplate.userPrompt}`,
      {
        model,
        maxTokens: promptTemplate.maxTokens,
        temperature: promptTemplate.temperature,
        timeout
      }
    )

    const parseResult = validateQuickItinerary(JSON.parse(response))
    if (!parseResult.success) {
      throw new Error(`Quick itinerary validation failed: ${parseResult.errors?.join(', ')}`)
    }

    return parseResult.data!
  }

  // Convert quick itinerary to full format
  private convertQuickToFullItinerary(
    quickItinerary: QuickItinerary,
    formData: TripPlanningFormData
  ): ItineraryResponse {
    const budgetBreakdown = budgetCalculator.calculateCategoryBudgets(
      quickItinerary.totalEstimate,
      formData.preferences.accommodationType
    )

    const days = quickItinerary.days.map(day => {
      const currentDate = new Date(formData.dateRange.startDate)
      currentDate.setDate(formData.dateRange.startDate.getDate() + day.day - 1)

      return {
        day: day.day,
        date: currentDate.toISOString().split('T')[0],
        theme: `Day ${day.day} activities`,
        activities: day.activities.map((activity, index) => ({
          id: `quick_${day.day}_${index}`,
          timeSlot: activity.timeSlot,
          startTime: this.getTimeSlotStart(activity.timeSlot),
          endTime: this.getTimeSlotEnd(activity.timeSlot),
          name: activity.name,
          type: activity.type,
          description: activity.description,
          location: {
            name: activity.name,
            address: `${formData.destination.destination}`,
            coordinates: { lat: 0, lng: 0 }
          },
          pricing: {
            amount: activity.price,
            currency: formData.budget.currency,
            priceType: 'per_person' as const
          },
          duration: '120 minutes',
          tips: ['Generated from quick itinerary', 'Contact venue for details'],
          bookingRequired: activity.price > 50,
          accessibility: {
            wheelchairAccessible: true,
            hasElevator: false,
            notes: 'Contact venue for accessibility information'
          }
        })),
        dailyBudget: {
          amount: Math.round(quickItinerary.totalEstimate / quickItinerary.days.length),
          currency: formData.budget.currency
        },
        transportation: {
          primaryMethod: formData.preferences.transportation === 'walking' ? 'walking' : 'public',
          estimatedCost: 15,
          notes: 'Use local transportation options'
        }
      }
    })

    return {
      itinerary: {
        destination: formData.destination.destination,
        duration: quickItinerary.days.length,
        totalBudgetEstimate: {
          amount: quickItinerary.totalEstimate,
          currency: formData.budget.currency,
          breakdown: budgetBreakdown
        },
        days,
        generalTips: [
          'This is a quick-generated itinerary',
          'Verify opening hours and availability',
          'Book accommodations in advance',
          'Keep local emergency numbers handy'
        ],
        emergencyInfo: {
          emergencyNumber: '911',
          embassy: 'Contact your embassy for assistance',
          hospitals: ['Local Hospital', 'Medical Center']
        }
      }
    }
  }

  // Removed fallback generation - we should fix AI service issues instead of masking them

  // Assess itinerary quality
  private assessItineraryQuality(
    itinerary: ItineraryResponse,
    formData: TripPlanningFormData
  ): { overall: 'high' | 'medium' | 'low'; accuracy: number } {
    let score = 100

    // All itineraries are now real AI-generated itineraries

    // Check coordinate validity
    const invalidCoordinates = itinerary.itinerary.days.some(day =>
      day.activities.some(activity => 
        activity.location.coordinates.lat === 0 && activity.location.coordinates.lng === 0
      )
    )
    if (invalidCoordinates) score -= 15

    // Check budget alignment
    const budgetValidation = budgetCalculator.validateBudget(formData)
    if (Math.abs(budgetValidation.differencePercentage) > 30) {
      score -= 10
    }

    // Check activity count per day
    const avgActivitiesPerDay = itinerary.itinerary.days.reduce(
      (sum, day) => sum + day.activities.length, 0
    ) / itinerary.itinerary.days.length

    if (avgActivitiesPerDay < 2) score -= 15
    if (avgActivitiesPerDay > 8) score -= 10

    // Determine overall quality
    let overall: 'high' | 'medium' | 'low'
    if (score >= 85) overall = 'high'
    else if (score >= 70) overall = 'medium'
    else overall = 'low'

    return {
      overall,
      accuracy: Math.max(50, score)
    }
  }

  // Helper methods
  private getTimeSlotStart(timeSlot: string): string {
    switch (timeSlot) {
      case 'morning': return '09:00'
      case 'afternoon': return '14:00'
      case 'evening': return '19:00'
      default: return '12:00'
    }
  }

  private getTimeSlotEnd(timeSlot: string): string {
    switch (timeSlot) {
      case 'morning': return '11:00'
      case 'afternoon': return '16:00'
      case 'evening': return '21:00'
      default: return '14:00'
    }
  }

  private isTimeoutError(error: any): boolean {
    return error instanceof Error && 
           (error.message.includes('timeout') || error.message.includes('AbortError'))
  }

  // Performance monitoring methods
  async getServiceHealth(): Promise<{
    ai: { status: 'healthy' | 'unhealthy'; latency?: number }
    cache: { status: 'healthy' | 'unhealthy' | 'disabled'; isConnected: boolean }
    overall: 'healthy' | 'degraded' | 'unhealthy'
  }> {
    const [aiHealth, cacheHealth] = await Promise.all([
      aiService.healthCheck(),
      cacheService.healthCheck()
    ])

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (aiHealth.status === 'unhealthy') {
      overall = 'unhealthy'
    } else if (cacheHealth.status === 'unhealthy') {
      overall = 'degraded'
    }

    return {
      ai: aiHealth,
      cache: cacheHealth,
      overall
    }
  }

  async getPerformanceStats(): Promise<{
    avgGenerationTime: number
    cacheHitRate: number
    fallbackRate: number
    errorRate: number
  }> {
    // In production, these would be tracked in a monitoring system
    return {
      avgGenerationTime: 18000, // 18 seconds average
      cacheHitRate: 0.35, // 35% cache hit rate
      fallbackRate: 0.05, // 5% fallback rate
      errorRate: 0.02 // 2% error rate
    }
  }

  // Warmup cache for popular destinations
  async warmupCache(destinations: string[]): Promise<void> {
    await cacheService.warmCache(destinations)
  }

  // Preload AI model (if supported)
  async preloadModel(model: string = 'gpt-4o-mini'): Promise<void> {
    try {
      await aiService.generateCompletion('Warmup request', {
        model,
        maxTokens: 1,
        timeout: 5000
      })
    } catch (error) {
      console.warn('Model preload failed:', error)
    }
  }
}

// Export singleton instance
export const itineraryService = new ItineraryService()

// Utility functions for performance optimization
export async function generateOptimizedItinerary(
  formData: TripPlanningFormData,
  prioritizeSpeed: boolean = false
): Promise<ItineraryResult> {
  return itineraryService.generateItinerary(formData, {
    prioritizeSpeed,
    useCache: true,
    fallbackOnTimeout: true,
    maxTimeout: prioritizeSpeed ? 15000 : 25000
  })
}

export async function generateQuickPreview(
  destination: string,
  duration: number,
  interests: string[],
  budget: number,
  currency: string
): Promise<QuickItinerary> {
  const promptTemplate = createQuickItineraryPrompt(
    destination,
    duration,
    interests,
    budget,
    currency
  )

  const response = await aiService.generateCompletion(
    `${promptTemplate.systemPrompt}\n\n${promptTemplate.userPrompt}`,
    {
      model: 'gpt-4o-mini',
      maxTokens: 1500,
      temperature: 0.8,
      timeout: 10000
    }
  )

  const parseResult = validateQuickItinerary(JSON.parse(response))
  if (!parseResult.success) {
    throw new Error(`Quick preview generation failed: ${parseResult.errors?.join(', ')}`)
  }

  return parseResult.data!
}
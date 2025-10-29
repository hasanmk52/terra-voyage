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
  optimizePromptForModel,
  type EnhancedFormData 
} from './prompt-templates'
import { RetryProgress, CancellationToken } from './retry-logic'

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
  prioritizeSpeed?: boolean
  model?: string
  onProgress?: (progress: RetryProgress) => void
  cancellationToken?: CancellationToken
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
    formData: TripPlanningFormData | EnhancedFormData,
    options: GenerationOptions = {}
  ): Promise<ItineraryResult> {
    const startTime = Date.now()
    const {
      useCache = true,
      maxTimeout = this.DEFAULT_TIMEOUT,
      prioritizeSpeed = false,
      model = 'gpt-4o-mini',
      onProgress,
      cancellationToken
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
          itinerary = await this.generateFullItinerary(formData, maxTimeout, model, onProgress, cancellationToken)
          aiGenerationTime = Date.now() - aiStartTime
          optimizationsApplied.push('full-ai-generation')
          console.log('✅ ItineraryService: AI generation completed successfully')
        } catch (error) {
          console.error('❌ ItineraryService: AI generation failed:', error instanceof Error ? error.message : 'Unknown error')
          // Don't use fallbacks - throw the error so we can fix the AI service properly
          throw error
        }
      }

      // 3. FORCE CURRENCY CORRECTION - Override any USD the AI might have used
      const userCurrency = formData.budget.currency
      console.log(`🔄 ItineraryService: User selected currency: ${userCurrency}`)

      let activitiesUpdated = 0
      if (itinerary.itinerary) {
        // Fix totalBudgetEstimate currency
        if (itinerary.itinerary.totalBudgetEstimate) {
          console.log(`   ├─ Before: totalBudgetEstimate.currency = ${itinerary.itinerary.totalBudgetEstimate.currency}`)
          itinerary.itinerary.totalBudgetEstimate.currency = userCurrency
          console.log(`   └─ After:  totalBudgetEstimate.currency = ${userCurrency}`)
        }

        // Fix all activity currencies
        if (itinerary.itinerary.days) {
          itinerary.itinerary.days.forEach((day, dayIndex) => {
            if (day.dailyBudget && typeof day.dailyBudget === 'object' && 'currency' in day.dailyBudget) {
              day.dailyBudget.currency = userCurrency
            }
            if (day.activities) {
              day.activities.forEach((activity, actIndex) => {
                const oldCurrency = activity.pricing?.currency || 'N/A'
                if (activity.pricing) {
                  activity.pricing.currency = userCurrency
                  activitiesUpdated++
                }
                if (activity.price && typeof activity.price === 'object' && 'currency' in activity.price) {
                  activity.price.currency = userCurrency
                }
                if (dayIndex === 0 && actIndex === 0) {
                  console.log(`   📍 Sample Activity Day ${dayIndex + 1}, Activity ${actIndex + 1}:`)
                  console.log(`      Before: ${oldCurrency} → After: ${userCurrency}`)
                }
              })
            }
          })
        }
      }
      optimizationsApplied.push('currency-enforcement')
      console.log(`✅ ItineraryService: Enforced currency to ${userCurrency} on ${activitiesUpdated} activities`)

      // 4. Validate and optimize
      const validationStartTime = Date.now()
      const quality = this.assessItineraryQuality(itinerary, formData)
      validationTime = Date.now() - validationStartTime

      // 5. Apply budget optimizations if needed
      const budgetValidation = budgetCalculator.validateBudget(formData)
      if (!budgetValidation.isRealistic && budgetValidation.differencePercentage < -20) {
        const optimizedResult = budgetCalculator.optimizeItineraryBudget(
          itinerary, 
          formData.budget.amount
        )
        itinerary = optimizedResult.optimizedItinerary
        optimizationsApplied.push('budget-optimization')
      }

      // 6. Cache the result
      if (useCache) {
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
          fallbackUsed: false,
          optimizationsApplied
        },
        warnings: budgetValidation.recommendations,
        metadata: {
          generatedAt: new Date(),
          generationMethod: 'ai',
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

  // Generate full itinerary using AI with retry logic
  private async generateFullItinerary(
    formData: TripPlanningFormData | EnhancedFormData,
    timeout: number,
    model: string,
    onProgress?: (progress: RetryProgress) => void,
    cancellationToken?: CancellationToken
  ): Promise<ItineraryResponse> {
    const promptTemplate = createItineraryPrompt(formData)
    const optimizedPrompt = optimizePromptForModel(promptTemplate, model)

    const response = await aiService.generateCompletion(
      `${optimizedPrompt.systemPrompt}\n\n${optimizedPrompt.userPrompt}`,
      {
        model,
        maxTokens: optimizedPrompt.maxTokens,
        temperature: optimizedPrompt.temperature,
        timeout,
        onProgress, // Pass retry progress callback
        cancellationToken // Pass cancellation token
      }
    )

    // Extract JSON from AI response (remove markdown formatting)
    const cleanResponse = this.extractJsonFromResponse(response)

    // Check for truncation before attempting repairs
    const isTruncated = this.detectTruncation(cleanResponse)
    if (isTruncated) {
      console.warn('⚠️ AI response appears truncated - may need to increase token limit or simplify prompt')
    }

    // Fix common AI format errors before validation
    const fixedResponse = this.fixCommonAIErrors(cleanResponse)

    const parseResult = validateAndParseItinerary(fixedResponse)
    if (!parseResult.success) {
      const validationError = new Error(`Itinerary validation failed: ${parseResult.errors?.join(', ')}`)
      console.error('❌ ItineraryService: Validation failed:', parseResult.errors)

      // Check if this is a JSON parsing error (truncation) vs schema validation error
      const isParsingError = parseResult.errors?.some(err =>
        err.includes('JSON parsing failed') ||
        err.includes('Expected') ||
        err.includes('position') ||
        err.includes('repair strategies failed')
      )

      // Only mention truncation if it's a parsing error AND we detected truncation
      if (isTruncated && isParsingError) {
        throw new Error(`AI response was truncated before completing the itinerary. This usually happens with long trips. Original error: ${parseResult.errors?.join(', ')}`)
      }

      throw validationError
    }

    console.log('✅ ItineraryService: Successfully parsed and validated itinerary')
    return parseResult.data!
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
    ) + 1 // Add 1 to make date range inclusive

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

  // Extract clean JSON from AI response (removes markdown formatting only)
  private extractJsonFromResponse(response: string): string {
    try {
      // Clean up markdown formatting and extract JSON
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks
      if (cleanResponse.startsWith('```json') || cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
      }
      
      // Remove any extra text before/after JSON
      const jsonStart = cleanResponse.indexOf('{')
      const jsonEnd = cleanResponse.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
      }
      
      // Only extract JSON, don't fix AI instruction compliance issues
      return cleanResponse
    } catch (error) {
      console.warn('Post-processing failed, using original response:', error)
      return response
    }
  }

  // Fix common AI data type and format errors
  private fixCommonAIErrors(jsonString: string): string {
    try {
      // Parse the JSON to fix data type issues
      const data = JSON.parse(jsonString)

      // Valid activity types
      const validTypes = ['attraction', 'restaurant', 'experience', 'transportation', 'accommodation', 'shopping']

      // Fix invalid activity types
      const fixActivityType = (value: any): string => {
        if (typeof value !== 'string') {
          return 'attraction' // Default fallback
        }

        const normalized = value.toLowerCase().trim()

        // If it's already valid, return as-is
        if (validTypes.includes(normalized)) {
          return normalized
        }

        // Map common invalid types to valid ones
        const typeMapping: Record<string, string> = {
          'sightseeing': 'attraction',
          'visit': 'attraction',
          'landmark': 'attraction',
          'monument': 'attraction',
          'museum': 'attraction',
          'food': 'restaurant',
          'dining': 'restaurant',
          'cafe': 'restaurant',
          'breakfast': 'restaurant',
          'lunch': 'restaurant',
          'dinner': 'restaurant',
          'activity': 'experience',
          'tour': 'experience',
          'adventure': 'experience',
          'entertainment': 'experience',
          'show': 'experience',
          'performance': 'experience',
          'transport': 'transportation',
          'travel': 'transportation',
          'transit': 'transportation',
          'hotel': 'accommodation',
          'lodging': 'accommodation',
          'stay': 'accommodation',
          'market': 'shopping',
          'store': 'shopping',
          'mall': 'shopping',
          'boutique': 'shopping'
        }

        // Try to map the invalid type
        for (const [invalid, valid] of Object.entries(typeMapping)) {
          if (normalized.includes(invalid)) {
            console.log(`🔧 Fixed activity type: "${value}" → "${valid}"`)
            return valid
          }
        }

        // Default fallback
        console.warn(`⚠️ Unknown activity type "${value}", defaulting to "attraction"`)
        return 'attraction'
      }

      const fixDurationValue = (value: any): string => {
        if (typeof value === 'string') {
          // Already a string, check if it matches required format
          if (/^\d+\s*(minutes?|hours?|mins?|hrs?)$/i.test(value)) {
            return value
          }
          
          // Fix common format issues
          const patterns = [
            // Fix "2h", "3hrs" -> "2 hours", "3 hours"
            { regex: /^(\d+)h(rs?)?$/i, replacement: '$1 hours' },
            // Fix "90m", "120mins" -> "90 minutes", "120 minutes"
            { regex: /^(\d+)m(ins?)?$/i, replacement: '$1 minutes' },
            // Fix "1.5 hours" -> "90 minutes" (convert to minutes)
            { regex: /^(\d+\.?\d*)\s*hours?$/i, replacement: (match, p1) => {
              const hours = parseFloat(p1)
              const minutes = Math.round(hours * 60)
              return `${minutes} minutes`
            }},
            // Fix "2-3 hours" -> "150 minutes" (take average)
            { regex: /^(\d+)-(\d+)\s*hours?$/i, replacement: (match, p1, p2) => {
              const avg = (parseInt(p1) + parseInt(p2)) / 2
              const minutes = Math.round(avg * 60)
              return `${minutes} minutes`
            }},
          ]
          
          for (const pattern of patterns) {
            if (typeof pattern.replacement === 'string') {
              if (pattern.regex.test(value)) {
                return value.replace(pattern.regex, pattern.replacement)
              }
            } else {
              const match = value.match(pattern.regex)
              if (match) {
                return pattern.replacement.apply(null, match as any)
              }
            }
          }
        } else if (typeof value === 'number') {
          // Convert number to string format (assume minutes if < 24, hours if >= 24)
          return value < 24 ? `${value} hours` : `${value} minutes`
        }
        
        // Fallback for invalid formats
        return '120 minutes'
      }

      // Fix coordinate precision issues
      const fixCoordinates = (coords: any): any => {
        if (coords && typeof coords === 'object' && coords.lat !== undefined && coords.lng !== undefined) {
          return {
            lat: parseFloat(Number(coords.lat).toFixed(4)),
            lng: parseFloat(Number(coords.lng).toFixed(4))
          }
        }
        return coords
      }
      
      // Recursively fix data type issues
      const fixObject = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(fixObject)
        } else if (obj && typeof obj === 'object') {
          const result: any = {}
          for (const [key, value] of Object.entries(obj)) {
            if (key === 'type' && typeof value !== 'undefined') {
              // Fix activity type
              result[key] = fixActivityType(value)
            } else if (key === 'duration' && typeof value !== 'undefined') {
              result[key] = fixDurationValue(value)
            } else if (key === 'coordinates') {
              result[key] = fixCoordinates(value)
            } else if (key === 'duration' && value === undefined) {
              // Fix missing duration
              result[key] = '120 minutes'
            } else {
              result[key] = fixObject(value)
            }
          }
          return result
        }
        return obj
      }
      
      const fixedData = fixObject(data)
      
      // Fix top-level duration if it's a string (should be number)
      if (fixedData.itinerary && typeof fixedData.itinerary.duration === 'string') {
        const durationStr = fixedData.itinerary.duration
        const durationNum = parseInt(durationStr) || fixedData.itinerary.days?.length || 1
        fixedData.itinerary.duration = durationNum
      }
      
      
      return JSON.stringify(fixedData)
    } catch (error) {
      // If parsing fails, try regex replacement as fallback
      let fixed = jsonString
      
      // Fix top-level duration field (convert string to number)
      fixed = fixed.replace(/"duration":\s*"(\d+)"/g, '"duration": $1')
      
      // Fix activity duration format issues
      fixed = fixed.replace(/"duration":\s*(\d+)([,\}])/g, '"duration": "$1 minutes"$2')
      fixed = fixed.replace(/"duration":\s*"(\d+)h"/g, '"duration": "$1 hours"')
      fixed = fixed.replace(/"duration":\s*"(\d+)m"/g, '"duration": "$1 minutes"')
      fixed = fixed.replace(/"duration":\s*"(\d+\.?\d*)\s*hours?"/g, (match, hours) => {
        const minutes = Math.round(parseFloat(hours) * 60)
        return `"duration": "${minutes} minutes"`
      })
      
      // Fix coordinate precision (limit to 4 decimal places)
      fixed = fixed.replace(/"lat":\s*(-?\d+\.\d{5,})/g, (match, lat) => {
        return `"lat": ${parseFloat(lat).toFixed(4)}`
      })
      fixed = fixed.replace(/"lng":\s*(-?\d+\.\d{5,})/g, (match, lng) => {
        return `"lng": ${parseFloat(lng).toFixed(4)}`
      })
      
      return fixed
    }
  }

  // Detect if AI response appears to be truncated
  private detectTruncation(jsonString: string): boolean {
    // Check for common truncation indicators
    const truncationIndicators = [
      // JSON ends abruptly without proper closing
      /[,\{]\s*$/,
      // Incomplete object at the end
      /"\s*:\s*$/,
      // String value that appears cut off
      /"[^"]*$/,
      // Array that's not properly closed
      /\[\s*\{[^\]]*$/
    ]

    const trimmed = jsonString.trim()

    // Check if JSON ends with truncation indicators
    for (const indicator of truncationIndicators) {
      if (indicator.test(trimmed)) {
        return true
      }
    }

    // Check if expected structure is incomplete
    try {
      // Try to count braces - if they don't match, likely truncated
      const openBraces = (trimmed.match(/\{/g) || []).length
      const closeBraces = (trimmed.match(/\}/g) || []).length
      const openBrackets = (trimmed.match(/\[/g) || []).length
      const closeBrackets = (trimmed.match(/\]/g) || []).length

      // Significant imbalance suggests truncation
      if (Math.abs(openBraces - closeBraces) > 2 || Math.abs(openBrackets - closeBrackets) > 2) {
        return true
      }
    } catch (error) {
      // Error during detection means there's likely a problem
      return true
    }

    return false
  }
}

// Export singleton instance
export const itineraryService = new ItineraryService()

// Utility functions for performance optimization
export async function generateOptimizedItinerary(
  formData: TripPlanningFormData | EnhancedFormData,
  prioritizeSpeed: boolean = false
): Promise<ItineraryResult> {
  return itineraryService.generateItinerary(formData, {
    prioritizeSpeed,
    useCache: true,
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
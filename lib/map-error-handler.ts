/**
 * Map Error Handler Service
 * Handles map loading failures, network issues, and provides fallback options
 */

export interface MapError {
  type: 'network' | 'token' | 'quota' | 'api' | 'loading' | 'unknown'
  message: string
  code?: string | number
  retryable: boolean
  fallbackSuggestion?: string
}

export interface MapLoadingState {
  isLoading: boolean
  error: MapError | null
  retryCount: number
  lastRetryAt?: Date
}

export interface RetryOptions {
  maxRetries: number
  retryDelay: number
  exponentialBackoff: boolean
}

export interface FallbackOptions {
  staticMaps: boolean
  coordinatesList: boolean
  externalLinks: boolean
}

export class MapErrorHandler {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  }

  private static readonly MAPBOX_ERROR_CODES = {
    401: { type: 'token', message: 'Invalid or missing Mapbox access token' },
    403: { type: 'token', message: 'Mapbox access token lacks required permissions' },
    429: { type: 'quota', message: 'Mapbox API rate limit exceeded' },
    500: { type: 'api', message: 'Mapbox server error' },
    503: { type: 'api', message: 'Mapbox service temporarily unavailable' }
  } as const

  /**
   * Parses Mapbox API errors and returns standardized error information
   */
  static parseMapboxError(error: any): MapError {
    // Network/fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Unable to connect to Mapbox. Check your internet connection.',
        retryable: true,
        fallbackSuggestion: 'Switch to offline mode or use static maps'
      }
    }

    // Response errors
    if (error.status) {
      const errorCode = error.status as keyof typeof this.MAPBOX_ERROR_CODES
      const knownError = this.MAPBOX_ERROR_CODES[errorCode]
      
      if (knownError) {
        return {
          type: knownError.type,
          message: knownError.message,
          code: error.status,
          retryable: knownError.type === 'api' || knownError.type === 'quota',
          fallbackSuggestion: this.getSuggestionForErrorType(knownError.type)
        }
      }
    }

    // Mapbox GL specific errors
    if (error.message?.includes('token')) {
      return {
        type: 'token',
        message: 'Mapbox token is invalid or expired',
        retryable: false,
        fallbackSuggestion: 'Check your NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable'
      }
    }

    if (error.message?.includes('style')) {
      return {
        type: 'loading',
        message: 'Failed to load map style',
        retryable: true,
        fallbackSuggestion: 'Try switching to a different map style'
      }
    }

    // Generic error
    return {
      type: 'unknown',
      message: error.message || 'An unknown map error occurred',
      retryable: true,
      fallbackSuggestion: 'Try refreshing the page or use alternative map options'
    }
  }

  /**
   * Determines if an error should trigger a retry
   */
  static shouldRetry(error: MapError, retryCount: number, maxRetries: number): boolean {
    if (!error.retryable || retryCount >= maxRetries) {
      return false
    }

    // Don't retry token errors - they need manual intervention
    if (error.type === 'token') {
      return false
    }

    // Always retry network and API errors (up to limit)
    if (error.type === 'network' || error.type === 'api') {
      return true
    }

    // Retry quota errors with longer delays
    if (error.type === 'quota' && retryCount < 2) {
      return true
    }

    return false
  }

  /**
   * Calculates retry delay with exponential backoff
   */
  static calculateRetryDelay(
    retryCount: number, 
    baseDelay: number, 
    exponentialBackoff: boolean = true
  ): number {
    if (!exponentialBackoff) {
      return baseDelay
    }

    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, retryCount)
    const jitter = Math.random() * 0.1 * delay
    return Math.min(delay + jitter, 30000) // Max 30 seconds
  }

  /**
   * Creates a retry function with proper error handling
   */
  static createRetryFunction<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): (onStateChange?: (state: MapLoadingState) => void) => Promise<T> {
    const retryOptions = { ...this.DEFAULT_RETRY_OPTIONS, ...options }

    return async (onStateChange?: (state: MapLoadingState) => void): Promise<T> => {
      let lastError: MapError | null = null
      let retryCount = 0

      // Initial loading state
      if (onStateChange) {
        onStateChange({
          isLoading: true,
          error: null,
          retryCount: 0
        })
      }

      while (retryCount <= retryOptions.maxRetries) {
        try {
          const result = await operation()
          
          // Success - clear loading state
          if (onStateChange) {
            onStateChange({
              isLoading: false,
              error: null,
              retryCount
            })
          }
          
          return result
        } catch (error) {
          const mapError = this.parseMapboxError(error)
          lastError = mapError

          // Update state with error
          if (onStateChange) {
            onStateChange({
              isLoading: false,
              error: mapError,
              retryCount,
              lastRetryAt: retryCount > 0 ? new Date() : undefined
            })
          }

          // Check if we should retry
          if (!this.shouldRetry(mapError, retryCount, retryOptions.maxRetries)) {
            throw mapError
          }

          // Calculate delay and wait
          const delay = this.calculateRetryDelay(
            retryCount,
            retryOptions.retryDelay,
            retryOptions.exponentialBackoff
          )

          console.log(`Map operation failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${retryOptions.maxRetries + 1})`)
          
          // Update loading state for retry
          if (onStateChange) {
            onStateChange({
              isLoading: true,
              error: mapError,
              retryCount: retryCount + 1
            })
          }

          await new Promise(resolve => setTimeout(resolve, delay))
          retryCount++
        }
      }

      // All retries exhausted
      throw lastError
    }
  }

  /**
   * Generates Google Static Maps URL as fallback
   */
  static generateStaticMapUrl(
    coordinates: Array<{ lat: number; lng: number; label?: string }>,
    options: {
      width?: number
      height?: number
      zoom?: number
      mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid'
    } = {}
  ): string {
    const {
      width = 600,
      height = 400,
      zoom = 12,
      mapType = 'roadmap'
    } = options

    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
    const params = new URLSearchParams({
      size: `${width}x${height}`,
      maptype: mapType,
      zoom: zoom.toString(),
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    })

    // Add markers for each coordinate
    coordinates.forEach((coord, index) => {
      const label = coord.label || String.fromCharCode(65 + index) // A, B, C...
      params.append('markers', `color:red|label:${label}|${coord.lat},${coord.lng}`)
    })

    // If multiple coordinates, fit to bounds
    if (coordinates.length > 1) {
      params.delete('zoom') // Let Google auto-zoom to fit markers
    }

    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Generates external map links for fallback
   */
  static generateExternalMapLinks(
    coordinates: { lat: number; lng: number },
    name?: string
  ): { google: string; apple: string; bing: string } {
    const { lat, lng } = coordinates
    const query = name ? encodeURIComponent(name) : `${lat},${lng}`

    return {
      google: `https://www.google.com/maps/search/?api=1&query=${query}`,
      apple: `https://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
      bing: `https://www.bing.com/maps?q=${query}&cp=${lat}~${lng}`
    }
  }

  /**
   * Validates coordinates for security and correctness
   */
  static validateCoordinates(lat: number, lng: number): {
    valid: boolean
    error?: string
  } {
    // Type validation
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { valid: false, error: 'Coordinates must be numbers' }
    }

    // NaN check
    if (isNaN(lat) || isNaN(lng)) {
      return { valid: false, error: 'Coordinates cannot be NaN' }
    }

    // Range validation
    if (lat < -90 || lat > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90' }
    }

    if (lng < -180 || lng > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180' }
    }

    // Null island check (often indicates missing/invalid data)
    if (lat === 0 && lng === 0) {
      return { valid: false, error: 'Null Island coordinates (0,0) detected' }
    }

    return { valid: true }
  }

  /**
   * Checks current network connectivity
   */
  static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Try to fetch a small resource with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=pk.test', {
        method: 'HEAD',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return true // Even 401 means we can reach Mapbox
    } catch (error) {
      return false
    }
  }

  /**
   * Gets appropriate suggestion based on error type
   */
  private static getSuggestionForErrorType(errorType: string): string {
    switch (errorType) {
      case 'token':
        return 'Check your Mapbox access token configuration'
      case 'quota':
        return 'Consider upgrading your Mapbox plan or wait for quota reset'
      case 'network':
        return 'Check your internet connection or use offline mode'
      case 'api':
        return 'Mapbox service issue - try again in a few minutes'
      default:
        return 'Try refreshing the page or use alternative map options'
    }
  }
}
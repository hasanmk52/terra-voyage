"use client"

import { circuitBreakers } from "./circuit-breaker"
import { retryManagers } from "./retry-logic"
import { placesQuotaMonitor } from "./places-quota-monitor"
import { destinationFallback, FallbackDestination } from "./destination-fallback"

let googlePlacesLoaded = false

export interface PlaceResult {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  types: string[]
  fallback?: boolean // Indicates if this is a fallback result
  coordinates?: { lat: number; lng: number } // For fallback results
  popularity?: number // For result ranking
}

export interface PlaceDetails {
  placeId: string
  name: string
  formattedAddress: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  photos?: any[]
  rating?: number
  website?: string
  formattedPhoneNumber?: string
  fallback?: boolean
  description?: string
}

// Quality control filters
const INAPPROPRIATE_TYPES = [
  'home_goods_store',
  'car_dealer',
  'car_rental',
  'car_repair',
  'car_wash',
  'gas_station',
  'funeral_home',
  'doctor',
  'dentist',
  'hospital',
  'pharmacy',
  'veterinary_care',
  'primary_school',
  'secondary_school',
  'university',
  'real_estate_agency',
  'insurance_agency',
  'accounting',
  'lawyer',
  'bank',
  'atm'
]

const TRAVEL_RELEVANT_TYPES = [
  'locality',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'country',
  'tourist_attraction',
  'travel_agency',
  'airport',
  'train_station',
  'bus_station',
  'lodging',
  'natural_feature',
  'park',
  'sublocality'
]

class GooglePlacesService {
  private apiKey: string
  private cache: Map<string, { results: PlaceResult[], timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  }

  // New Places API doesn't require initialization
  async initialize(): Promise<void> {
    googlePlacesLoaded = true
  }

  /**
   * Main search method with quota monitoring and fallback
   * FR-005.1: Autocomplete suggestions within 500ms
   * FR-005.2: Quota management and fallback activation
   * FR-005.4: Fallback search mechanisms
   */
  async searchDestinations(query: string, options: {
    useCache?: boolean
    timeoutMs?: number
  } = {}): Promise<PlaceResult[]> {
    const { useCache = true, timeoutMs = 8000 } = options

    try {
      // Check cache first for performance optimization
      if (useCache) {
        const cached = this.getCachedResults(query)
        if (cached) {
          console.log('📋 Using cached results for:', query)
          return cached
        }
      }

      // Check quota status before making API call
      const quotaStatus = placesQuotaMonitor.getQuotaStatus()
      
      // Use fallback if quota exceeded or approaching limit
      if (quotaStatus.shouldUseFallback || !this.apiKey) {
        return this.getFallbackResults(query)
      }

      // Make API call with timeout and quota monitoring
      const results = await this.makeApiSearchCall(query, timeoutMs)
      
      // Record successful API usage
      placesQuotaMonitor.recordRequest('searchText')
      
      // Apply quality control filters
      const filteredResults = this.applyQualityControl(results)
      
      // Cache results for future use
      if (useCache && filteredResults.length > 0) {
        this.cacheResults(query, filteredResults)
      }
      
      return filteredResults

    } catch (error) {
      // Handle AbortError specifically - don't use fallback for user cancellations
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('signal is aborted'))) {
        console.log('🚫 Places API search was cancelled or timed out')
        return [] // Return empty results instead of fallback for cancelled requests
      }
      
      console.warn('⚠️ Places API error, falling back to offline search:', error)
      
      // Record the error for monitoring
      this.recordApiError(error)
      
      // Return fallback results
      return this.getFallbackResults(query)
    }
  }

  /**
   * Make the actual API call with retry logic and timeout
   */
  private async makeApiSearchCall(query: string, timeoutMs: number): Promise<PlaceResult[]> {
    return retryManagers.maps.execute(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        // For short queries, bias towards cities and regions
        const enhancedQuery = query.length <= 4 ? `${query} city` : query
        
        const requestBody = {
          textQuery: enhancedQuery,
          maxResultCount: 10,
          languageCode: 'en'
        }


        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.location',
            'User-Agent': 'TerraVoyage/1.0',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          
          // Handle specific error types
          if (response.status === 429) {
            placesQuotaMonitor.recordError('quota_exceeded', 'Rate limit exceeded')
            throw new Error('QUOTA_EXCEEDED: API rate limit exceeded')
          }
          if (response.status === 403) {
            placesQuotaMonitor.recordError('auth_error', 'API key invalid or permissions insufficient')
            throw new Error('AUTH_ERROR: Invalid API key or insufficient permissions')
          }
          
          throw new Error(`Places API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()
        
        if (data.places && data.places.length > 0) {
          const results: PlaceResult[] = data.places.map((place: any) => ({
            placeId: place.id,
            description: place.formattedAddress || place.displayName?.text || query,
            mainText: place.displayName?.text || query,
            secondaryText: place.formattedAddress || "",
            types: place.types || [],
            coordinates: place.location ? {
              lat: place.location.latitude,
              lng: place.location.longitude
            } : undefined,
            popularity: this.calculatePopularityScore(place.types || [])
          }))
          
          return results
        }

        return []
      } catch (error) {
        clearTimeout(timeoutId)
        
        // Handle AbortError specifically - don't log as failure
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('signal is aborted'))) {
          throw error // Re-throw but don't retry
        }
        
        throw error
      }
    })
  }

  /**
   * Apply quality control filters to search results
   * FR-005.3: Quality control and travel relevance ranking
   */
  private applyQualityControl(results: PlaceResult[]): PlaceResult[] {
    return results
      .filter(result => this.isAppropriateDestination(result))
      .filter(result => this.hasValidCoordinates(result))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 5) // FR-005.1: Minimum 5 relevant suggestions
  }

  /**
   * Check if destination is appropriate for travel
   * FR-005.3: Exclude inappropriate locations and detailed places
   */
  private isAppropriateDestination(result: PlaceResult): boolean {
    // Check for inappropriate types
    const hasInappropriateType = result.types.some(type => 
      INAPPROPRIATE_TYPES.includes(type)
    )
    
    if (hasInappropriateType) {
      return false
    }
    
    // Allow major geographic areas and cities
    const MAJOR_LOCATION_TYPES = [
      'locality',
      'administrative_area_level_1', // States, provinces
      'administrative_area_level_2', // Counties, regions  
      'country',
      'political', // Add political as it's common for cities
      'sublocality' // Add sublocality for districts/areas
    ]
    
    const hasMajorLocationType = result.types.some(type => 
      MAJOR_LOCATION_TYPES.includes(type)
    )
    
    // Exclude specific establishments, attractions, and detailed places
    const EXCLUDE_DETAILED_TYPES = [
      'establishment',
      'store',
      'restaurant',
      'premise',
      'route',
      'street_address'
    ]
    
    const hasDetailedType = result.types.some(type => 
      EXCLUDE_DETAILED_TYPES.includes(type)
    )
    
    // If it has both major location type and detailed type, check priority
    if (hasMajorLocationType && hasDetailedType) {
      // Allow if it has high-priority location types
      const hasHighPriorityType = result.types.some(type => 
        ['locality', 'country', 'administrative_area_level_1'].includes(type)
      )
      
      if (hasHighPriorityType) {
        return true
      }
    }
    
    return hasMajorLocationType && !hasDetailedType
  }

  /**
   * Validate coordinates are reasonable
   * FR-005.3: Validate coordinates correspond to searchable locations
   */
  private hasValidCoordinates(result: PlaceResult): boolean {
    if (!result.coordinates) {
      return true // API results without coordinates are still valid
    }
    
    const { lat, lng } = result.coordinates
    return destinationFallback.validateCoordinates(lat, lng)
  }

  /**
   * Calculate popularity score for ranking
   * FR-005.3: Rank by travel relevance
   */
  private calculatePopularityScore(types: string[]): number {
    let score = 5 // Base score
    
    // Boost score for travel-relevant types
    if (types.includes('locality')) score += 3
    if (types.includes('tourist_attraction')) score += 2
    if (types.includes('country')) score += 1
    if (types.includes('administrative_area_level_1')) score += 1
    
    // Penalty for less relevant types
    if (types.includes('establishment')) score -= 1
    if (types.includes('point_of_interest')) score -= 0.5
    
    return Math.max(1, score)
  }

  /**
   * Get cached results if available and not expired
   */
  private getCachedResults(query: string): PlaceResult[] | null {
    const cached = this.cache.get(query.toLowerCase())
    if (!cached) return null
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION
    if (isExpired) {
      this.cache.delete(query.toLowerCase())
      return null
    }
    
    return cached.results
  }

  /**
   * Cache search results for performance
   */
  private cacheResults(query: string, results: PlaceResult[]): void {
    this.cache.set(query.toLowerCase(), {
      results,
      timestamp: Date.now()
    })
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  /**
   * Get fallback search results from offline database
   * FR-005.4: Fallback maintains same interface as API search
   * Only return major cities and popular destinations
   */
  private getFallbackResults(query: string): PlaceResult[] {
    const fallbackDestinations = destinationFallback.searchDestinations(query, 8) // Get more results
    
    // For short queries, prioritize cities that start with the query
    if (query.length <= 4) {
      const startsWithQuery = fallbackDestinations.filter(dest => 
        dest.name.toLowerCase().startsWith(query.toLowerCase()) &&
        dest.popularity >= 6 // Lower threshold for partial matches
      )
      
      if (startsWithQuery.length > 0) {
        return startsWithQuery.slice(0, 5).map(dest => 
          destinationFallback.toPlaceResult(dest)
        )
      }
    }
    
    // Filter to only include major cities and popular destinations
    const majorCitiesOnly = fallbackDestinations.filter(dest => 
      dest.popularity >= 7 && // Only high popularity destinations
      ((dest.description && dest.description.toLowerCase().includes('city')) ||
       (dest.description && dest.description.toLowerCase().includes('capital')) ||
       dest.type === 'city' ||
       dest.type === 'country')
    )
    
    return majorCitiesOnly.map(dest => 
      destinationFallback.toPlaceResult(dest)
    )
  }

  /**
   * Record API errors for monitoring
   */
  private recordApiError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('QUOTA_EXCEEDED')) {
      placesQuotaMonitor.recordError('quota_exceeded', errorMessage)
    } else if (errorMessage.includes('AUTH_ERROR')) {
      placesQuotaMonitor.recordError('auth_error', errorMessage)
    } else if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
      placesQuotaMonitor.recordError('network_error', 'Request timeout')
    } else {
      placesQuotaMonitor.recordError('unknown', errorMessage)
    }
  }

  /**
   * Get quota status for UI display
   * FR-005.2: Display quota status in admin dashboard
   */
  getQuotaStatus() {
    return placesQuotaMonitor.getQuotaStatus()
  }

  /**
   * Get usage statistics for monitoring
   */
  getUsageStats() {
    return placesQuotaMonitor.getUsageStats()
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    // Handle fallback destination IDs
    if (placeId.includes('-')) {
      const destination = destinationFallback.searchDestinations(placeId, 1)[0]
      if (destination) {
        return destinationFallback.toPlaceDetails(destination)
      }
    }

    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.")
    }

    // Check quota before making API call
    if (!placesQuotaMonitor.canMakeRequest()) {
      throw new Error("Places API quota exceeded. Please try again later.")
    }

    // Use the new Places API Place Details
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,rating,websiteUri,nationalPhoneNumber'
      }
    })

    if (!response.ok) {
      throw new Error(`Place Details API error: ${response.status} ${response.statusText}`)
    }

    const place = await response.json()
    
    const details: PlaceDetails = {
      placeId: place.id,
      name: place.displayName?.text || "Unknown Place",
      formattedAddress: place.formattedAddress || "",
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
      },
      types: place.types || [],
      rating: place.rating,
      website: place.websiteUri,
      formattedPhoneNumber: place.nationalPhoneNumber,
    }
    
    return details
  }

  async searchNearbyAttractions(
    location: { lat: number; lng: number },
    radius: number = 5000
  ): Promise<PlaceDetails[]> {
    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.")
    }

    // Use the new Places API Nearby Search
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating'
      },
      body: JSON.stringify({
        includedTypes: ["tourist_attraction"],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng
            },
            radius: radius
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Nearby Search API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.places && data.places.length > 0) {
      const attractions: PlaceDetails[] = data.places.map((place: any) => ({
        placeId: place.id,
        name: place.displayName?.text || "Unknown Attraction",
        formattedAddress: place.formattedAddress || "",
        geometry: {
          location: {
            lat: place.location?.latitude || location.lat,
            lng: place.location?.longitude || location.lng,
          },
        },
        types: place.types || [],
        rating: place.rating,
      }))
      return attractions
    }

    return []
  }

  /**
   * Search specifically for countries in real-time
   * Always fetches from Google Places API with no fallbacks
   */
  async searchCountries(query: string, options: {
    useCache?: boolean
    timeoutMs?: number
  } = {}): Promise<PlaceResult[]> {
    const { useCache = true, timeoutMs = 8000 } = options

    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.")
    }

    // Check cache first for performance
    const cacheKey = `country_${query.toLowerCase()}`
    if (useCache) {
      const cached = this.getCachedResults(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Always make real-time API call for countries
    const results = await this.makeApiCountryCall(query, timeoutMs)
    
    // Record successful API usage
    placesQuotaMonitor.recordRequest('searchText')
    
    // Cache results for performance
    if (useCache && results.length > 0) {
      this.cacheResults(cacheKey, results)
    }
    
    return results
  }

  /**
   * Make the actual API call for country search
   */
  private async makeApiCountryCall(query: string, timeoutMs: number): Promise<PlaceResult[]> {
    return retryManagers.maps.execute(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const requestBody = {
          textQuery: `${query} country`,
          maxResultCount: 8,
          includedType: 'country', // Specifically search for countries
          languageCode: 'en'
        }

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.location',
            'User-Agent': 'TerraVoyage/1.0',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          
          if (response.status === 429) {
            placesQuotaMonitor.recordError('quota_exceeded', 'Rate limit exceeded')
            throw new Error('QUOTA_EXCEEDED: API rate limit exceeded')
          }
          
          throw new Error(`Places API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const places = data.places || []

        return places.map((place: any) => ({
          placeId: place.id,
          mainText: place.displayName?.text || '',
          secondaryText: place.formattedAddress || '',
          description: `${place.displayName?.text || ''}, ${place.formattedAddress || ''}`,
          types: place.types || [],
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0,
            },
          },
        }))
      } catch (error) {
        clearTimeout(timeoutId)
        
        // Handle AbortError specifically - don't log as failure
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('signal is aborted'))) {
          console.log('🚫 Country search API request timed out or was cancelled')
          throw error // Re-throw but don't retry
        }
        
        throw error
      }
    })
  }

}

// Export singleton instance
export const googlePlaces = new GooglePlacesService()
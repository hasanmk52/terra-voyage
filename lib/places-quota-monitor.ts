/**
 * Enhanced Map Services Quota Monitoring System
 * Tracks API usage across all map services, enforces limits, and manages fallback activation
 */

interface QuotaUsage {
  searchTextRequests: number
  placeDetailsRequests: number
  nearbySearchRequests: number
  autocompleteRequests: number
  mapboxGeocodingRequests: number
  mapboxDirectionsRequests: number
  mapboxTileRequests: number
  staticMapRequests: number
  totalRequests: number
  lastReset: number
  dailyLimit: number
  monthlyLimit: number
  errors: number
}

interface QuotaStatus {
  isAvailable: boolean
  usagePercentage: number
  remainingRequests: number
  timeUntilReset: number
  shouldUseFallback: boolean
  warningThreshold: boolean
  criticalThreshold: boolean
  errorRate: number
  recommendedService: 'google' | 'mapbox' | 'offline' | 'static'
}

class PlacesQuotaMonitor {
  private usage: QuotaUsage
  private readonly STORAGE_KEY = 'terra_voyage_places_quota'
  private readonly WARNING_THRESHOLD = 0.7 // 70%
  private readonly CRITICAL_THRESHOLD = 0.85 // 85%
  private readonly FALLBACK_THRESHOLD = 0.95 // 95%
  
  // Enhanced quotas covering all map services
  private readonly DEFAULT_DAILY_LIMIT = 2000
  private readonly DEFAULT_MONTHLY_LIMIT = 50000
  private readonly MAX_ERROR_RATE = 0.15 // 15%

  constructor() {
    this.usage = this.loadUsage()
    this.resetIfNeeded()
  }

  private loadUsage(): QuotaUsage {
    if (typeof window === 'undefined') {
      return this.createEmptyUsage()
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return this.createEmptyUsage()
      }

      const parsed = JSON.parse(stored)
      
      // Validate structure
      if (this.isValidUsage(parsed)) {
        return parsed
      }
      
      return this.createEmptyUsage()
    } catch (error) {
      console.warn('Failed to load quota usage:', error)
      return this.createEmptyUsage()
    }
  }

  private isValidUsage(usage: any): usage is QuotaUsage {
    return (
      typeof usage === 'object' &&
      typeof usage.searchTextRequests === 'number' &&
      typeof usage.placeDetailsRequests === 'number' &&
      typeof usage.nearbySearchRequests === 'number' &&
      typeof usage.autocompleteRequests === 'number' &&
      typeof usage.totalRequests === 'number' &&
      typeof usage.lastReset === 'number' &&
      typeof usage.dailyLimit === 'number' &&
      typeof usage.monthlyLimit === 'number'
    )
  }

  private createEmptyUsage(): QuotaUsage {
    return {
      searchTextRequests: 0,
      placeDetailsRequests: 0,
      nearbySearchRequests: 0,
      autocompleteRequests: 0,
      mapboxGeocodingRequests: 0,
      mapboxDirectionsRequests: 0,
      mapboxTileRequests: 0,
      staticMapRequests: 0,
      totalRequests: 0,
      lastReset: Date.now(),
      dailyLimit: this.DEFAULT_DAILY_LIMIT,
      monthlyLimit: this.DEFAULT_MONTHLY_LIMIT,
      errors: 0
    }
  }

  private saveUsage(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usage))
    } catch (error) {
      console.warn('Failed to save quota usage:', error)
    }
  }

  private resetIfNeeded(): void {
    const now = Date.now()
    const dayInMs = 24 * 60 * 60 * 1000
    
    // Reset daily counters if more than 24 hours have passed
    if (now - this.usage.lastReset > dayInMs) {
      this.usage.searchTextRequests = 0
      this.usage.placeDetailsRequests = 0
      this.usage.nearbySearchRequests = 0
      this.usage.autocompleteRequests = 0
      this.usage.mapboxGeocodingRequests = 0
      this.usage.mapboxDirectionsRequests = 0
      this.usage.mapboxTileRequests = 0
      this.usage.staticMapRequests = 0
      this.usage.totalRequests = 0
      this.usage.errors = 0
      this.usage.lastReset = now
      this.saveUsage()
    }
  }

  /**
   * Record a map service API request
   */
  recordRequest(
    type: 'searchText' | 'placeDetails' | 'nearbySearch' | 'autocomplete' | 
          'mapboxGeocoding' | 'mapboxDirections' | 'mapboxTiles' | 'staticMap',
    success: boolean = true
  ): boolean {
    this.resetIfNeeded()
    
    // Check if at quota limit
    if (this.usage.totalRequests >= this.usage.dailyLimit) {
      console.warn('Daily quota limit reached, request blocked')
      return false
    }
    
    this.usage.totalRequests++
    
    if (!success) {
      this.usage.errors++
    }
    
    switch (type) {
      case 'searchText':
        this.usage.searchTextRequests++
        break
      case 'placeDetails':
        this.usage.placeDetailsRequests++
        break
      case 'nearbySearch':
        this.usage.nearbySearchRequests++
        break
      case 'autocomplete':
        this.usage.autocompleteRequests++
        break
      case 'mapboxGeocoding':
        this.usage.mapboxGeocodingRequests++
        break
      case 'mapboxDirections':
        this.usage.mapboxDirectionsRequests++
        break
      case 'mapboxTiles':
        this.usage.mapboxTileRequests++
        break
      case 'staticMap':
        this.usage.staticMapRequests++
        break
    }
    
    this.saveUsage()
    return true
  }

  /**
   * Get current quota status with enhanced metrics
   */
  getQuotaStatus(): QuotaStatus {
    this.resetIfNeeded()
    
    const usagePercentage = this.usage.totalRequests / this.usage.dailyLimit
    const remainingRequests = Math.max(0, this.usage.dailyLimit - this.usage.totalRequests)
    const timeUntilReset = this.getTimeUntilReset()
    const errorRate = this.usage.totalRequests > 0 ? this.usage.errors / this.usage.totalRequests : 0
    
    // Determine recommended service based on usage and errors
    const recommendedService = this.getRecommendedService(usagePercentage, errorRate)
    
    return {
      isAvailable: this.usage.totalRequests < this.usage.dailyLimit,
      usagePercentage,
      remainingRequests,
      timeUntilReset,
      shouldUseFallback: usagePercentage >= this.FALLBACK_THRESHOLD || errorRate > this.MAX_ERROR_RATE,
      warningThreshold: usagePercentage >= this.WARNING_THRESHOLD,
      criticalThreshold: usagePercentage >= this.CRITICAL_THRESHOLD,
      errorRate,
      recommendedService
    }
  }

  /**
   * Get recommended service based on current usage patterns
   */
  private getRecommendedService(usagePercentage: number, errorRate: number): 'google' | 'mapbox' | 'offline' | 'static' {
    // If high error rate or near quota limit, recommend fallbacks
    if (errorRate > this.MAX_ERROR_RATE || usagePercentage >= this.FALLBACK_THRESHOLD) {
      // If Mapbox services have lower usage, recommend them
      const mapboxUsage = (this.usage.mapboxGeocodingRequests + this.usage.mapboxDirectionsRequests + this.usage.mapboxTileRequests) / this.usage.totalRequests
      if (mapboxUsage < 0.5 && this.usage.totalRequests > 10) {
        return 'mapbox'
      }
      
      // If very high usage or errors, recommend offline/static
      if (usagePercentage >= 0.9 || errorRate > 0.2) {
        return 'static'
      }
      
      return 'offline'
    }
    
    // If critical threshold reached, prefer Mapbox over Google
    if (usagePercentage >= this.CRITICAL_THRESHOLD) {
      return 'mapbox'
    }
    
    // Normal operation - use Google services
    return 'google'
  }

  /**
   * Check if API should be used (not at quota limit)
   */
  canMakeRequest(): boolean {
    const status = this.getQuotaStatus()
    return status.isAvailable && !status.shouldUseFallback
  }

  /**
   * Check if we should show warning about quota usage
   */
  shouldShowWarning(): boolean {
    const status = this.getQuotaStatus()
    return status.warningThreshold && !status.shouldUseFallback
  }

  /**
   * Check if we should use fallback instead of API
   */
  shouldUseFallback(): boolean {
    const status = this.getQuotaStatus()
    return status.shouldUseFallback || !status.isAvailable
  }

  /**
   * Get time until quota reset in milliseconds
   */
  private getTimeUntilReset(): number {
    const dayInMs = 24 * 60 * 60 * 1000
    const timeSinceReset = Date.now() - this.usage.lastReset
    return Math.max(0, dayInMs - timeSinceReset)
  }

  /**
   * Get formatted time until reset
   */
  getFormattedTimeUntilReset(): string {
    const ms = this.getTimeUntilReset()
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  /**
   * Get detailed usage statistics
   */
  getUsageStats() {
    this.resetIfNeeded()
    const status = this.getQuotaStatus()
    
    return {
      ...this.usage,
      status,
      timeUntilResetFormatted: this.getFormattedTimeUntilReset()
    }
  }

  /**
   * Configure quota limits (for admin use)
   */
  setQuotaLimits(dailyLimit: number, monthlyLimit: number): void {
    this.usage.dailyLimit = dailyLimit
    this.usage.monthlyLimit = monthlyLimit
    this.saveUsage()
  }

  /**
   * Force reset quotas (for testing/admin use)
   */
  forceReset(): void {
    this.usage = this.createEmptyUsage()
    this.saveUsage()
  }

  /**
   * Record an API error for monitoring
   */
  recordError(type: 'quota_exceeded' | 'auth_error' | 'network_error' | 'unknown', details?: string): void {
    // Could extend to track error rates and patterns
    console.warn(`Places API Error [${type}]:`, details)
    
    // If quota exceeded, force fallback mode
    if (type === 'quota_exceeded') {
      this.usage.totalRequests = this.usage.dailyLimit
      this.saveUsage()
    }
  }
}

// Export singleton instance
export const placesQuotaMonitor = new PlacesQuotaMonitor()

// Export types for use in components
export type { QuotaStatus, QuotaUsage }
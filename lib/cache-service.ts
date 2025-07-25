import { createClient, RedisClientType } from 'redis'
import { ItineraryResponse } from './itinerary-validation'

// Cache configuration
interface CacheConfig {
  defaultTTL: number // seconds
  itineraryTTL: number // seconds for itineraries
  destinationTTL: number // seconds for destination data
  maxRetries: number
  retryDelay: number
}

const defaultConfig: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  itineraryTTL: 86400, // 24 hours
  destinationTTL: 604800, // 1 week
  maxRetries: 3,
  retryDelay: 1000, // 1 second
}

// Cache key generators
export const CacheKeys = {
  itinerary: (formDataHash: string) => `itinerary:${formDataHash}`,
  destination: (destination: string) => `destination:${destination.toLowerCase().replace(/\s+/g, '_')}`,
  activities: (destination: string, type: string) => `activities:${destination}:${type}`,
  weather: (destination: string, date: string) => `weather:${destination}:${date}`,
  attractions: (destination: string) => `attractions:${destination}`,
  health: () => 'cache:health',
}

// Redis cache service
class CacheService {
  private client: RedisClientType | null = null
  private isConnected = false
  private config: CacheConfig
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  // Initialize Redis connection
  async initialize(): Promise<void> {
    if (this.isConnected) return

    try {
      const redisUrl = process.env.REDIS_URL
      if (!redisUrl) {
        console.warn('⚠️  Redis URL not configured, caching will be disabled')
        return
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries >= this.maxReconnectAttempts) {
              console.error('❌ Max Redis reconnection attempts reached')
              return false
            }
            return Math.min(retries * 1000, 5000) // Max 5 second delay
          },
        },
      })

      // Event listeners
      this.client.on('error', (error) => {
        console.error('Redis error:', error)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        console.log('🔌 Redis connecting...')
      })

      this.client.on('ready', () => {
        console.log('✅ Redis connected and ready')
        this.isConnected = true
        this.reconnectAttempts = 0
      })

      this.client.on('end', () => {
        console.log('🔌 Redis connection closed')
        this.isConnected = false
      })

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++
        console.log(`🔄 Redis reconnecting... (attempt ${this.reconnectAttempts})`)
      })

      await this.client.connect()
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error)
      this.client = null
      this.isConnected = false
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'disabled'
    latency?: number
    error?: string
    isConnected: boolean
  }> {
    if (!this.client) {
      return {
        status: 'disabled',
        isConnected: false,
      }
    }

    try {
      const start = Date.now()
      await this.client.ping()
      const latency = Date.now() - start

      return {
        status: 'healthy',
        latency,
        isConnected: this.isConnected,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        isConnected: false,
      }
    }
  }

  // Generic get method
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null
    }

    try {
      const value = await this.client.get(key)
      if (!value) return null

      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  // Generic set method
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false
    }

    try {
      const serialized = JSON.stringify(value)
      const expiration = ttl || this.config.defaultTTL

      await this.client.setEx(key, expiration, serialized)
      return true
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      return false
    }
  }

  // Delete key
  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false
    }

    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  }

  // Delete multiple keys by pattern
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0
    }

    try {
      const keys = await this.client.keys(pattern)
      if (keys.length === 0) return 0

      await this.client.del(keys)
      return keys.length
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error)
      return 0
    }
  }

  // Increment counter
  async increment(key: string, ttl?: number): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 1
    }

    try {
      const result = await this.client.incr(key)
      if (result === 1 && ttl) {
        // Set expiration only on first increment
        await this.client.expire(key, ttl)
      }
      return result
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error)
      return 1
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    connected: boolean
    keyCount?: number
    memoryUsage?: string
    uptime?: number
  }> {
    if (!this.client || !this.isConnected) {
      return { connected: false }
    }

    try {
      const info = await this.client.info('stats')
      const dbSize = await this.client.dbSize()

      // Parse Redis info response
      const stats = info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':')
        if (key && value) {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, string>)

      return {
        connected: true,
        keyCount: dbSize,
        memoryUsage: stats.used_memory_human,
        uptime: parseInt(stats.uptime_in_seconds) || 0,
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return { connected: false }
    }
  }

  // Specialized methods for itinerary caching
  async getItinerary(formDataHash: string): Promise<ItineraryResponse | null> {
    const key = CacheKeys.itinerary(formDataHash)
    const cached = await this.get<ItineraryResponse & { cachedAt: number }>(key)
    
    if (!cached) return null

    // Add cache metadata
    return {
      ...cached,
      _cached: true,
      _cachedAt: cached.cachedAt,
    } as ItineraryResponse & { _cached: boolean; _cachedAt: number }
  }

  async setItinerary(formDataHash: string, itinerary: ItineraryResponse): Promise<boolean> {
    const key = CacheKeys.itinerary(formDataHash)
    const cacheData = {
      ...itinerary,
      cachedAt: Date.now(),
    }
    
    return this.set(key, cacheData, this.config.itineraryTTL)
  }

  // Destination data caching
  async getDestination(destination: string): Promise<any | null> {
    const key = CacheKeys.destination(destination)
    return this.get(key)
  }

  async setDestination(destination: string, data: any): Promise<boolean> {
    const key = CacheKeys.destination(destination)
    return this.set(key, data, this.config.destinationTTL)
  }

  // Activity suggestions caching
  async getActivities(destination: string, type: string): Promise<any[] | null> {
    const key = CacheKeys.activities(destination, type)
    return this.get(key)
  }

  async setActivities(destination: string, type: string, activities: any[]): Promise<boolean> {
    const key = CacheKeys.activities(destination, type)
    return this.set(key, activities, this.config.defaultTTL)
  }

  // Cache warming for popular destinations
  async warmCache(destinations: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${destinations.length} destinations...`)
    
    for (const destination of destinations) {
      try {
        // Pre-cache destination data
        const key = CacheKeys.destination(destination)
        const existing = await this.get(key)
        
        if (!existing) {
          // This would typically fetch from an external API
          const placeholderData = {
            name: destination,
            preWarmed: true,
            warmedAt: Date.now(),
          }
          await this.setDestination(destination, placeholderData)
        }
      } catch (error) {
        console.error(`Failed to warm cache for ${destination}:`, error)
      }
    }
  }

  // Cleanup expired keys
  async cleanup(): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0
    }

    try {
      // Redis automatically handles TTL expiration, but we can clean up patterns
      const expiredItineraries = await this.deletePattern('itinerary:*_expired')
      console.log(`🧹 Cleaned up ${expiredItineraries} expired cache entries`)
      return expiredItineraries
    } catch (error) {
      console.error('Cache cleanup error:', error)
      return 0
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit()
        console.log('✅ Redis disconnected gracefully')
      } catch (error) {
        console.error('Error during Redis disconnect:', error)
      } finally {
        this.client = null
        this.isConnected = false
      }
    }
  }
}

// Create and export singleton instance
export const cacheService = new CacheService()

// Initialize cache service (call this in your app startup)
export async function initializeCache(): Promise<void> {
  await cacheService.initialize()
}

// Cache utility functions
export function generateCacheKey(data: any): string {
  // Create a hash of the form data for cache key
  const sortedData = JSON.stringify(data, Object.keys(data).sort())
  
  // Simple hash function (in production, consider using a proper crypto hash)
  let hash = 0
  for (let i = 0; i < sortedData.length; i++) {
    const char = sortedData.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

// Cache wrapper for functions
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args)
    
    // Try to get from cache first
    const cached = await cacheService.get<R>(key)
    if (cached) {
      return cached
    }
    
    // Execute function
    const result = await fn(...args)
    
    // Cache the result
    await cacheService.set(key, result, ttl)
    
    return result
  }
}

// Export types
export interface CacheMetadata {
  _cached?: boolean
  _cachedAt?: number
}

export type CachedResponse<T> = T & CacheMetadata
import { createClient, RedisClientType } from 'redis'
import { FlightOffer, FlightSearchParams } from './amadeus-client'
import { HotelOffer, HotelSearchParams } from './booking-client'

export interface CachedPrice {
  data: FlightOffer[] | HotelOffer[]
  cachedAt: number
  expiresAt: number
  searchParams: FlightSearchParams | HotelSearchParams
  type: 'flight' | 'hotel'
}

export interface PriceAlert {
  id: string
  userId: string
  type: 'flight' | 'hotel'
  searchParams: FlightSearchParams | HotelSearchParams
  targetPrice: number
  currentPrice: number
  isActive: boolean
  createdAt: number
  lastChecked: number
  alertsSent: number
}

export interface PriceHistory {
  id: string
  type: 'flight' | 'hotel'
  searchKey: string
  price: number
  currency: string
  timestamp: number
  source: string
}

class PriceCacheManager {
  private client: RedisClientType | null = null
  private connected = false

  constructor() {
    this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      })

      this.client.on('error', (error) => {
        console.error('Redis connection error:', error)
        this.connected = false
      })

      this.client.on('connect', () => {
        console.log('Redis connected successfully')
        this.connected = true
      })

      this.client.on('disconnect', () => {
        console.log('Redis disconnected')
        this.connected = false
      })

    } catch (error) {
      console.error('Failed to initialize Redis:', error)
    }
  }

  private async ensureConnection(): Promise<RedisClientType | null> {
    if (!this.client) {
      console.warn('Redis client not initialized, caching disabled')
      return null
    }

    if (!this.connected) {
      try {
        await this.client.connect()
        this.connected = true
      } catch (error) {
        console.error('Failed to connect to Redis:', error)
        return null
      }
    }

    return this.client
  }

  /**
   * Generate cache key for price data
   */
  private generateCacheKey(type: 'flight' | 'hotel', params: any): string {
    const normalizedParams = { ...params }
    
    // Sort object keys for consistent cache keys
    const sortedParams = Object.keys(normalizedParams)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizedParams[key]
        return result
      }, {} as any)

    const paramsString = JSON.stringify(sortedParams)
    const hash = Buffer.from(paramsString).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
    
    return `price:${type}:${hash}`
  }

  /**
   * Cache price data
   */
  async cachePrice(
    type: 'flight' | 'hotel',
    params: FlightSearchParams | HotelSearchParams,
    data: FlightOffer[] | HotelOffer[],
    ttlSeconds: number = 1800 // 30 minutes default
  ): Promise<boolean> {
    const client = await this.ensureConnection()
    if (!client) return false

    try {
      const cacheKey = this.generateCacheKey(type, params)
      const cachedPrice: CachedPrice = {
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000),
        searchParams: params,
        type
      }

      await client.setEx(cacheKey, ttlSeconds, JSON.stringify(cachedPrice))
      
      // Also store in price history
      await this.storePriceHistory(type, params, data)
      
      return true
    } catch (error) {
      console.error('Error caching price data:', error)
      return false
    }
  }

  /**
   * Retrieve cached price data
   */
  async getCachedPrice(
    type: 'flight' | 'hotel',
    params: FlightSearchParams | HotelSearchParams
  ): Promise<CachedPrice | null> {
    const client = await this.ensureConnection()
    if (!client) return null

    try {
      const cacheKey = this.generateCacheKey(type, params)
      const cached = await client.get(cacheKey)
      
      if (!cached) return null

      const cachedPrice: CachedPrice = JSON.parse(cached)
      
      // Check if expired
      if (Date.now() > cachedPrice.expiresAt) {
        await client.del(cacheKey)
        return null
      }

      return cachedPrice
    } catch (error) {
      console.error('Error retrieving cached price:', error)
      return null
    }
  }

  /**
   * Store price history for analytics
   */
  private async storePriceHistory(
    type: 'flight' | 'hotel',
    params: FlightSearchParams | HotelSearchParams,
    data: FlightOffer[] | HotelOffer[]
  ): Promise<void> {
    const client = await this.ensureConnection()
    if (!client || data.length === 0) return

    try {
      const searchKey = this.generateCacheKey(type, params)
      const lowestPrice = Math.min(...data.map(item => parseFloat(item.price.total)))
      
      const historyEntry: PriceHistory = {
        id: `${searchKey}:${Date.now()}`,
        type,
        searchKey,
        price: lowestPrice,
        currency: data[0].price.currency,
        timestamp: Date.now(),
        source: type === 'flight' ? 'amadeus' : 'booking'
      }

      // Store in a sorted set for easy retrieval by timestamp
      const historyKey = `history:${type}:${searchKey}`
      await client.zAdd(historyKey, {
        score: Date.now(),
        value: JSON.stringify(historyEntry)
      })

      // Keep only last 30 days of history
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      await client.zRemRangeByScore(historyKey, 0, thirtyDaysAgo)

    } catch (error) {
      console.error('Error storing price history:', error)
    }
  }

  /**
   * Get price history for a search
   */
  async getPriceHistory(
    type: 'flight' | 'hotel',
    params: FlightSearchParams | HotelSearchParams,
    days: number = 30
  ): Promise<PriceHistory[]> {
    const client = await this.ensureConnection()
    if (!client) return []

    try {
      const searchKey = this.generateCacheKey(type, params)
      const historyKey = `history:${type}:${searchKey}`
      
      const daysAgo = Date.now() - (days * 24 * 60 * 60 * 1000)
      const entries = await client.zRangeByScore(historyKey, daysAgo, '+inf')

      return entries.map(entry => JSON.parse(entry) as PriceHistory)
    } catch (error) {
      console.error('Error retrieving price history:', error)
      return []
    }
  }

  /**
   * Create price alert
   */
  async createPriceAlert(
    userId: string,
    type: 'flight' | 'hotel',
    params: FlightSearchParams | HotelSearchParams,
    targetPrice: number
  ): Promise<string | null> {
    const client = await this.ensureConnection()
    if (!client) return null

    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const searchKey = this.generateCacheKey(type, params)
      
      const alert: PriceAlert = {
        id: alertId,
        userId,
        type,
        searchParams: params,
        targetPrice,
        currentPrice: 0, // Will be updated when first checked
        isActive: true,
        createdAt: Date.now(),
        lastChecked: 0,
        alertsSent: 0
      }

      // Store alert
      const alertKey = `alert:${alertId}`
      await client.setEx(alertKey, 30 * 24 * 60 * 60, JSON.stringify(alert)) // 30 days

      // Add to user's alerts list
      const userAlertsKey = `user_alerts:${userId}`
      await client.sAdd(userAlertsKey, alertId)

      // Add to active alerts queue for processing
      const activeAlertsKey = 'active_alerts'
      await client.sAdd(activeAlertsKey, alertId)

      return alertId
    } catch (error) {
      console.error('Error creating price alert:', error)
      return null
    }
  }

  /**
   * Get user's price alerts
   */
  async getUserAlerts(userId: string): Promise<PriceAlert[]> {
    const client = await this.ensureConnection()
    if (!client) return []

    try {
      const userAlertsKey = `user_alerts:${userId}`
      const alertIds = await client.sMembers(userAlertsKey)

      const alerts: PriceAlert[] = []
      for (const alertId of alertIds) {
        const alertKey = `alert:${alertId}`
        const alertData = await client.get(alertKey)
        
        if (alertData) {
          alerts.push(JSON.parse(alertData) as PriceAlert)
        } else {
          // Clean up orphaned reference
          await client.sRem(userAlertsKey, alertId)
        }
      }

      return alerts
    } catch (error) {
      console.error('Error retrieving user alerts:', error)
      return []
    }
  }

  /**
   * Update price alert
   */
  async updatePriceAlert(
    alertId: string,
    updates: Partial<PriceAlert>
  ): Promise<boolean> {
    const client = await this.ensureConnection()
    if (!client) return false

    try {
      const alertKey = `alert:${alertId}`
      const alertData = await client.get(alertKey)
      
      if (!alertData) return false

      const alert: PriceAlert = { ...JSON.parse(alertData), ...updates }
      await client.setEx(alertKey, 30 * 24 * 60 * 60, JSON.stringify(alert))

      return true
    } catch (error) {
      console.error('Error updating price alert:', error)
      return false
    }
  }

  /**
   * Delete price alert
   */
  async deletePriceAlert(alertId: string, userId: string): Promise<boolean> {
    const client = await this.ensureConnection()
    if (!client) return false

    try {
      const alertKey = `alert:${alertId}`
      const userAlertsKey = `user_alerts:${userId}`
      const activeAlertsKey = 'active_alerts'

      // Remove from all locations
      await Promise.all([
        client.del(alertKey),
        client.sRem(userAlertsKey, alertId),
        client.sRem(activeAlertsKey, alertId)
      ])

      return true
    } catch (error) {
      console.error('Error deleting price alert:', error)
      return false
    }
  }

  /**
   * Get all active alerts for processing
   */
  async getActiveAlerts(): Promise<PriceAlert[]> {
    const client = await this.ensureConnection()
    if (!client) return []

    try {
      const activeAlertsKey = 'active_alerts'
      const alertIds = await client.sMembers(activeAlertsKey)

      const alerts: PriceAlert[] = []
      for (const alertId of alertIds) {
        const alertKey = `alert:${alertId}`
        const alertData = await client.get(alertKey)
        
        if (alertData) {
          const alert = JSON.parse(alertData) as PriceAlert
          if (alert.isActive) {
            alerts.push(alert)
          }
        } else {
          // Clean up orphaned reference
          await client.sRem(activeAlertsKey, alertId)
        }
      }

      return alerts
    } catch (error) {
      console.error('Error retrieving active alerts:', error)
      return []
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<number> {
    const client = await this.ensureConnection()
    if (!client) return 0

    try {
      // Redis automatically handles TTL expiration, but we can clean up history
      const historyKeys = await client.keys('history:*')
      let cleaned = 0

      for (const key of historyKeys) {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
        const removed = await client.zRemRangeByScore(key, 0, thirtyDaysAgo)
        cleaned += removed
      }

      return cleaned
    } catch (error) {
      console.error('Error clearing expired cache:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number
    priceKeys: number
    historyKeys: number
    alertKeys: number
    memoryUsage: string
  }> {
    const client = await this.ensureConnection()
    if (!client) {
      return {
        totalKeys: 0,
        priceKeys: 0,
        historyKeys: 0,
        alertKeys: 0,
        memoryUsage: '0 MB'
      }
    }

    try {
      const [
        totalKeys,
        priceKeys,
        historyKeys,
        alertKeys,
        memInfo
      ] = await Promise.all([
        client.dbSize(),
        client.keys('price:*').then(keys => keys.length),
        client.keys('history:*').then(keys => keys.length),
        client.keys('alert:*').then(keys => keys.length),
        client.info('memory')
      ])

      // Parse memory usage from Redis info
      const memoryMatch = memInfo.match(/used_memory_human:(.+)\r?\n/)
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : '0 MB'

      return {
        totalKeys,
        priceKeys,
        historyKeys,
        alertKeys,
        memoryUsage
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return {
        totalKeys: 0,
        priceKeys: 0,
        historyKeys: 0,
        alertKeys: 0,
        memoryUsage: '0 MB'
      }
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.disconnect()
        this.connected = false
      } catch (error) {
        console.error('Error disconnecting from Redis:', error)
      }
    }
  }
}

// Singleton instance
export const priceCacheManager = new PriceCacheManager()

// Graceful shutdown
process.on('SIGINT', async () => {
  await priceCacheManager.disconnect()
})

process.on('SIGTERM', async () => {
  await priceCacheManager.disconnect()
})
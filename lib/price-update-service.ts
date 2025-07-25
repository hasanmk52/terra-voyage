import cron from 'node-cron'
import { amadeusClient, FlightSearchParams } from './amadeus-client'
import { bookingClient, HotelSearchParams } from './booking-client'
import { priceCacheManager, PriceAlert } from './price-cache'
import { db } from './db'

export interface PriceUpdateJob {
  id: string
  type: 'flight' | 'hotel'
  searchParams: FlightSearchParams | HotelSearchParams
  priority: 'high' | 'medium' | 'low'
  lastUpdated: number
  nextUpdate: number
  failures: number
  isActive: boolean
  userId?: string
}

export interface PriceUpdateResult {
  jobId: string
  success: boolean
  priceChange?: {
    oldPrice: number
    newPrice: number
    percentChange: number
  }
  error?: string
  executionTime: number
}

class PriceUpdateService {
  private isRunning = false
  private updateQueue: PriceUpdateJob[] = []
  private cronJobs: cron.ScheduledTask[] = []
  private readonly MAX_CONCURRENT_UPDATES = 5
  private readonly MAX_FAILURES = 3
  private activeUpdates = new Set<string>()

  constructor() {
    this.initializeCronJobs()
  }

  private initializeCronJobs() {
    // Every 15 minutes - update high priority prices
    const highPriorityJob = cron.schedule('*/15 * * * *', () => {
      this.processHighPriorityUpdates()
    }, { scheduled: false })

    // Every hour - update medium priority prices
    const mediumPriorityJob = cron.schedule('0 * * * *', () => {
      this.processMediumPriorityUpdates()
    }, { scheduled: false })

    // Every 6 hours - update low priority prices
    const lowPriorityJob = cron.schedule('0 */6 * * *', () => {
      this.processLowPriorityUpdates()
    }, { scheduled: false })

    // Daily at 2 AM - process price alerts
    const alertsJob = cron.schedule('0 2 * * *', () => {
      this.processPriceAlerts()
    }, { scheduled: false })

    // Daily at 3 AM - cleanup expired data
    const cleanupJob = cron.schedule('0 3 * * *', () => {
      this.cleanupExpiredData()
    }, { scheduled: false })

    this.cronJobs = [highPriorityJob, mediumPriorityJob, lowPriorityJob, alertsJob, cleanupJob]
  }

  /**
   * Start the price update service
   */
  start(): void {
    if (this.isRunning) {
      console.log('Price update service is already running')
      return
    }

    console.log('Starting price update service...')
    this.isRunning = true

    // Start all cron jobs
    this.cronJobs.forEach(job => job.start())

    // Initial processing
    this.processAllUpdates()

    console.log('Price update service started successfully')
  }

  /**
   * Stop the price update service
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('Stopping price update service...')
    this.isRunning = false

    // Stop all cron jobs
    this.cronJobs.forEach(job => job.stop())

    console.log('Price update service stopped')
  }

  /**
   * Add a price monitoring job
   */
  async addUpdateJob(job: Omit<PriceUpdateJob, 'id' | 'lastUpdated' | 'nextUpdate' | 'failures' | 'isActive'>): Promise<string> {
    const jobId = `${job.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const updateJob: PriceUpdateJob = {
      id: jobId,
      ...job,
      lastUpdated: 0,
      nextUpdate: Date.now(),
      failures: 0,
      isActive: true
    }

    this.updateQueue.push(updateJob)
    
    // Store in cache for persistence
    if (priceCacheManager.isAvailable()) {
      const client = await priceCacheManager['ensureConnection']()
      if (client) {
        await client.setEx(`update_job:${jobId}`, 30 * 24 * 60 * 60, JSON.stringify(updateJob))
      }
    }

    console.log(`Added price update job: ${jobId} (${job.type})`)
    return jobId
  }

  /**
   * Remove a price monitoring job
   */
  async removeUpdateJob(jobId: string): Promise<boolean> {
    const index = this.updateQueue.findIndex(job => job.id === jobId)
    if (index !== -1) {
      this.updateQueue.splice(index, 1)
    }

    // Remove from cache
    if (priceCacheManager.isAvailable()) {
      const client = await priceCacheManager['ensureConnection']()
      if (client) {
        await client.del(`update_job:${jobId}`)
      }
    }

    return index !== -1
  }

  /**
   * Process high priority price updates
   */
  private async processHighPriorityUpdates(): Promise<void> {
    if (!this.isRunning) return

    const highPriorityJobs = this.updateQueue.filter(job => 
      job.priority === 'high' && 
      job.isActive && 
      job.nextUpdate <= Date.now() &&
      !this.activeUpdates.has(job.id)
    )

    await this.processJobBatch(highPriorityJobs.slice(0, this.MAX_CONCURRENT_UPDATES))
  }

  /**
   * Process medium priority price updates
   */
  private async processMediumPriorityUpdates(): Promise<void> {
    if (!this.isRunning) return

    const mediumPriorityJobs = this.updateQueue.filter(job => 
      job.priority === 'medium' && 
      job.isActive && 
      job.nextUpdate <= Date.now() &&
      !this.activeUpdates.has(job.id)
    )

    await this.processJobBatch(mediumPriorityJobs.slice(0, this.MAX_CONCURRENT_UPDATES))
  }

  /**
   * Process low priority price updates
   */
  private async processLowPriorityUpdates(): Promise<void> {
    if (!this.isRunning) return

    const lowPriorityJobs = this.updateQueue.filter(job => 
      job.priority === 'low' && 
      job.isActive && 
      job.nextUpdate <= Date.now() &&
      !this.activeUpdates.has(job.id)
    )

    await this.processJobBatch(lowPriorityJobs.slice(0, this.MAX_CONCURRENT_UPDATES))
  }

  /**
   * Process all pending updates
   */
  private async processAllUpdates(): Promise<void> {
    if (!this.isRunning) return

    // Load jobs from cache if queue is empty
    if (this.updateQueue.length === 0) {
      await this.loadJobsFromCache()
    }

    const pendingJobs = this.updateQueue.filter(job => 
      job.isActive && 
      job.nextUpdate <= Date.now() &&
      !this.activeUpdates.has(job.id)
    )

    // Sort by priority and next update time
    pendingJobs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      return a.nextUpdate - b.nextUpdate
    })

    await this.processJobBatch(pendingJobs.slice(0, this.MAX_CONCURRENT_UPDATES))
  }

  /**
   * Process a batch of jobs concurrently
   */
  private async processJobBatch(jobs: PriceUpdateJob[]): Promise<PriceUpdateResult[]> {
    const results = await Promise.allSettled(
      jobs.map(job => this.processUpdateJob(job))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          jobId: jobs[index].id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          executionTime: 0
        }
      }
    })
  }

  /**
   * Process a single price update job
   */
  private async processUpdateJob(job: PriceUpdateJob): Promise<PriceUpdateResult> {
    const startTime = Date.now()
    this.activeUpdates.add(job.id)

    try {
      console.log(`Processing price update job: ${job.id} (${job.type})`)

      // Get current cached price for comparison
      const cachedPrice = await priceCacheManager.getCachedPrice(job.type, job.searchParams)
      const oldPrice = cachedPrice ? this.getLowestPrice(cachedPrice.data) : 0

      let newData: any[] = []
      
      // Fetch new price data
      if (job.type === 'flight') {
        const response = await amadeusClient.searchFlights(job.searchParams as FlightSearchParams)
        newData = response.data
      } else {
        const response = await bookingClient.searchHotels(job.searchParams as HotelSearchParams)
        newData = response.data
      }

      if (newData.length === 0) {
        throw new Error('No price data received')
      }

      // Cache the new data
      await priceCacheManager.cachePrice(job.type, job.searchParams, newData, 1800) // 30 minutes

      // Calculate price change
      const newPrice = this.getLowestPrice(newData)
      let priceChange: PriceUpdateResult['priceChange'] | undefined

      if (oldPrice > 0) {
        const percentChange = ((newPrice - oldPrice) / oldPrice) * 100
        priceChange = {
          oldPrice,
          newPrice,
          percentChange
        }
      }

      // Update job status
      job.lastUpdated = Date.now()
      job.nextUpdate = this.calculateNextUpdate(job)
      job.failures = 0

      await this.saveJobToCache(job)

      const executionTime = Date.now() - startTime
      console.log(`Price update completed for ${job.id} in ${executionTime}ms`)

      return {
        jobId: job.id,
        success: true,
        priceChange,
        executionTime
      }

    } catch (error) {
      console.error(`Price update failed for job ${job.id}:`, error)

      // Update failure count
      job.failures++
      if (job.failures >= this.MAX_FAILURES) {
        job.isActive = false
        console.log(`Deactivating job ${job.id} after ${this.MAX_FAILURES} failures`)
      } else {
        // Exponential backoff for next update
        job.nextUpdate = Date.now() + (Math.pow(2, job.failures) * 60 * 1000)
      }

      await this.saveJobToCache(job)

      return {
        jobId: job.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      }

    } finally {
      this.activeUpdates.delete(job.id)
    }
  }

  /**
   * Process price alerts
   */
  private async processPriceAlerts(): Promise<void> {
    if (!this.isRunning) return

    console.log('Processing price alerts...')

    try {
      const alerts = await priceCacheManager.getActiveAlerts()
      console.log(`Found ${alerts.length} active price alerts`)

      for (const alert of alerts) {
        await this.checkPriceAlert(alert)
        
        // Add small delay between alerts to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      console.error('Error processing price alerts:', error)
    }
  }

  /**
   * Check individual price alert
   */
  private async checkPriceAlert(alert: PriceAlert): Promise<void> {
    try {
      // Skip if checked recently (within last hour)
      if (Date.now() - alert.lastChecked < 60 * 60 * 1000) {
        return
      }

      let currentPrice = 0

      // Get current price
      if (alert.type === 'flight') {
        const response = await amadeusClient.searchFlights(alert.searchParams as FlightSearchParams)
        if (response.data.length > 0) {
          currentPrice = this.getLowestPrice(response.data)
        }
      } else {
        const response = await bookingClient.searchHotels(alert.searchParams as HotelSearchParams)
        if (response.data.length > 0) {
          currentPrice = this.getLowestPrice(response.data)
        }
      }

      // Check if alert should be triggered
      if (currentPrice > 0 && currentPrice <= alert.targetPrice) {
        await this.triggerPriceAlert(alert, currentPrice)
      }

      // Update alert status
      await priceCacheManager.updatePriceAlert(alert.id, {
        currentPrice,
        lastChecked: Date.now()
      })

    } catch (error) {
      console.error(`Error checking price alert ${alert.id}:`, error)
    }
  }

  /**
   * Trigger price alert notification
   */
  private async triggerPriceAlert(alert: PriceAlert, currentPrice: number): Promise<void> {
    try {
      console.log(`Price alert triggered for user ${alert.userId}: ${currentPrice} <= ${alert.targetPrice}`)

      // Here you would integrate with your notification system
      // For now, we'll just log and update the alert

      // Create notification in database
      if (alert.userId) {
        await db.notification.create({
          data: {
            userId: alert.userId,
            type: 'PRICE_ALERT',
            title: `Price Alert: ${alert.type === 'flight' ? 'Flight' : 'Hotel'} Deal Found!`,
            message: `Great news! The price has dropped to $${currentPrice.toFixed(2)}, which meets your target of $${alert.targetPrice.toFixed(2)}.`,
            data: {
              alertId: alert.id,
              currentPrice,
              targetPrice: alert.targetPrice,
              searchParams: alert.searchParams
            }
          }
        })
      }

      // Update alert
      await priceCacheManager.updatePriceAlert(alert.id, {
        alertsSent: alert.alertsSent + 1
      })

    } catch (error) {
      console.error('Error triggering price alert:', error)
    }
  }

  /**
   * Calculate next update time based on priority and failures
   */
  private calculateNextUpdate(job: PriceUpdateJob): number {
    const baseIntervals = {
      high: 15 * 60 * 1000,    // 15 minutes
      medium: 60 * 60 * 1000,  // 1 hour
      low: 6 * 60 * 60 * 1000  // 6 hours
    }

    const interval = baseIntervals[job.priority]
    const jitter = Math.random() * 0.1 * interval // ±10% jitter

    return Date.now() + interval + jitter
  }

  /**
   * Get lowest price from price data
   */
  private getLowestPrice(data: any[]): number {
    if (data.length === 0) return 0
    return Math.min(...data.map(item => parseFloat(item.price.total)))
  }

  /**
   * Load jobs from cache
   */
  private async loadJobsFromCache(): Promise<void> {
    if (!priceCacheManager.isAvailable()) return

    try {
      const client = await priceCacheManager['ensureConnection']()
      if (!client) return

      const jobKeys = await client.keys('update_job:*')
      
      for (const key of jobKeys) {
        const jobData = await client.get(key)
        if (jobData) {
          const job = JSON.parse(jobData) as PriceUpdateJob
          if (job.isActive) {
            this.updateQueue.push(job)
          }
        }
      }

      console.log(`Loaded ${this.updateQueue.length} price update jobs from cache`)
    } catch (error) {
      console.error('Error loading jobs from cache:', error)
    }
  }

  /**
   * Save job to cache
   */
  private async saveJobToCache(job: PriceUpdateJob): Promise<void> {
    if (!priceCacheManager.isAvailable()) return

    try {
      const client = await priceCacheManager['ensureConnection']()
      if (!client) return

      await client.setEx(`update_job:${job.id}`, 30 * 24 * 60 * 60, JSON.stringify(job))
    } catch (error) {
      console.error('Error saving job to cache:', error)
    }
  }

  /**
   * Clean up expired data
   */
  private async cleanupExpiredData(): Promise<void> {
    console.log('Cleaning up expired price data...')

    try {
      // Clean expired cache entries
      const cleanedEntries = await priceCacheManager.clearExpired()
      console.log(`Cleaned ${cleanedEntries} expired cache entries`)

      // Clean inactive jobs
      const inactiveJobs = this.updateQueue.filter(job => !job.isActive)
      for (const job of inactiveJobs) {
        await this.removeUpdateJob(job.id)
      }
      console.log(`Removed ${inactiveJobs.length} inactive jobs`)

    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Get service statistics
   */
  getStats(): {
    isRunning: boolean
    totalJobs: number
    activeJobs: number
    activeUpdates: number
    queuedUpdates: number
  } {
    const activeJobs = this.updateQueue.filter(job => job.isActive).length
    const queuedUpdates = this.updateQueue.filter(job => 
      job.isActive && job.nextUpdate <= Date.now()
    ).length

    return {
      isRunning: this.isRunning,
      totalJobs: this.updateQueue.length,
      activeJobs,
      activeUpdates: this.activeUpdates.size,
      queuedUpdates
    }
  }
}

// Singleton instance
export const priceUpdateService = new PriceUpdateService()

// Graceful shutdown
process.on('SIGINT', () => {
  priceUpdateService.stop()
})

process.on('SIGTERM', () => {
  priceUpdateService.stop()
})
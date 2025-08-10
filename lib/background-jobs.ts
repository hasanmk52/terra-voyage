import { TripStatusService } from './trip-status-service'

export interface BackgroundJobResult {
  jobName: string
  success: boolean
  executionTime: number
  result?: any
  error?: string
}

export class BackgroundJobService {
  private static jobs: Map<string, NodeJS.Timeout> = new Map()
  private static isShuttingDown = false
  private static maxJobExecutionTime = 5 * 60 * 1000 // 5 minutes timeout

  /**
   * Start all background jobs
   */
  static startAll() {
    console.log('🚀 Starting background jobs...')
    
    // Start status transition job (runs every 30 minutes)
    this.startJob('status-transitions', this.runStatusTransitions, 30 * 60 * 1000)
    
    // Add other jobs here as needed
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => this.shutdown())
    process.on('SIGINT', () => this.shutdown())
  }

  /**
   * Start a specific recurring job
   */
  static startJob(
    jobName: string, 
    jobFunction: () => Promise<any>, 
    intervalMs: number
  ) {
    // Clear existing job if running
    this.stopJob(jobName)
    
    console.log(`📅 Starting job "${jobName}" with ${intervalMs / 1000}s interval`)
    
    // Run immediately, then set interval
    this.executeJob(jobName, jobFunction)
    
    const interval = setInterval(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.executeJob(jobName, jobFunction)
        } catch (error) {
          // Prevent unhandled promise rejection from crashing the app
          console.error(`❌ Unhandled error in job "${jobName}":`, error)
        }
      }
    }, intervalMs)
    
    this.jobs.set(jobName, interval)
  }

  /**
   * Stop a specific job
   */
  static stopJob(jobName: string) {
    const job = this.jobs.get(jobName)
    if (job) {
      clearInterval(job)
      this.jobs.delete(jobName)
      console.log(`🛑 Stopped job "${jobName}"`)
    }
  }

  /**
   * Execute a job with error handling and timing
   */
  private static async executeJob(
    jobName: string, 
    jobFunction: () => Promise<any>
  ): Promise<BackgroundJobResult> {
    const startTime = Date.now()
    
    try {
      console.log(`🔄 Executing job "${jobName}"...`)
      
      // Add timeout to prevent jobs from hanging
      const result = await Promise.race([
        jobFunction(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Job execution timeout')), this.maxJobExecutionTime)
        })
      ])
      
      const executionTime = Date.now() - startTime
      
      console.log(`✅ Job "${jobName}" completed in ${executionTime}ms`)
      
      return {
        jobName,
        success: true,
        executionTime,
        result
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`❌ Job "${jobName}" failed after ${executionTime}ms:`, errorMessage)
      
      return {
        jobName,
        success: false,
        executionTime,
        error: errorMessage
      }
    }
  }

  /**
   * Run a job once (for testing or manual execution)
   */
  static async runJobOnce(
    jobName: string, 
    jobFunction: () => Promise<any>
  ): Promise<BackgroundJobResult> {
    return await this.executeJob(jobName, jobFunction)
  }

  /**
   * Status transition job function
   */
  private static async runStatusTransitions(): Promise<any> {
    try {
      const results = await TripStatusService.runDateBasedStatusChecks()
      
      // Log summary
      const summary = {
        processed: results.processed,
        transitions: results.transitions.length,
        successful: results.transitions.filter(t => t.success).length,
        failed: results.transitions.filter(t => !t.success).length,
        errors: results.errors.length
      }
      
      console.log('📊 Status transition job summary:', summary)
      
      // Log errors if any
      if (results.errors.length > 0) {
        console.warn('⚠️ Status transition errors:', results.errors)
      }
      
      return summary
    } catch (error) {
      console.error('❌ Status transition job error:', error)
      throw error
    }
  }

  /**
   * Shutdown all jobs gracefully
   */
  static shutdown() {
    if (this.isShuttingDown) return
    
    console.log('🛑 Shutting down background jobs...')
    this.isShuttingDown = true
    
    // Stop all jobs
    for (const [jobName] of this.jobs) {
      this.stopJob(jobName)
    }
    
    // Clear the jobs map to prevent memory leaks
    this.jobs.clear()
    
    console.log('✅ Background jobs shutdown complete')
  }

  /**
   * Get status of all running jobs
   */
  static getJobStatus(): { jobName: string; running: boolean }[] {
    return Array.from(this.jobs.keys()).map(jobName => ({
      jobName,
      running: this.jobs.has(jobName)
    }))
  }

  /**
   * Health check for background jobs
   */
  static async healthCheck(): Promise<{
    healthy: boolean
    runningJobs: number
    totalJobs: number
    lastStatusCheck?: any
  }> {
    const runningJobs = this.jobs.size
    const totalJobs = 1 // Currently only status-transitions job
    
    // Test the status transition service
    let lastStatusCheck = null
    try {
      const stats = await TripStatusService.getStatusStatistics()
      lastStatusCheck = {
        timestamp: new Date().toISOString(),
        statistics: stats,
        healthy: true
      }
    } catch (error) {
      lastStatusCheck = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        healthy: false
      }
    }
    
    return {
      healthy: runningJobs > 0 && lastStatusCheck?.healthy,
      runningJobs,
      totalJobs,
      lastStatusCheck
    }
  }
}

// Export for easy importing
export default BackgroundJobService

// Auto-start jobs in production (can be disabled with env var)
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_BACKGROUND_JOBS !== 'true') {
  // Start jobs after a short delay to allow app initialization
  const startupTimer = setTimeout(() => {
    BackgroundJobService.startAll()
  }, 5000)
  
  // Clean up timer reference to prevent memory leak
  startupTimer.unref()
}
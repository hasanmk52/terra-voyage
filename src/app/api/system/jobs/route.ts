import { NextRequest, NextResponse } from 'next/server'
import { BackgroundJobService } from '@/lib/background-jobs'

// GET /api/system/jobs - Get background job status and health
export async function GET(request: NextRequest) {
  try {
    // Optional API key verification
    const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('key')
    const expectedKey = process.env.SYSTEM_API_KEY
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get job status and health check
    const jobStatus = BackgroundJobService.getJobStatus()
    const healthCheck = await BackgroundJobService.healthCheck()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      jobs: jobStatus,
      health: healthCheck,
      environment: process.env.NODE_ENV,
      backgroundJobsEnabled: process.env.DISABLE_BACKGROUND_JOBS !== 'true'
    })

  } catch (error) {
    console.error('❌ Error getting job status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/system/jobs - Control background jobs (admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin API key verification
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.ADMIN_API_KEY || process.env.SYSTEM_API_KEY
    
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, jobName } = body

    let result: any = { success: true }

    switch (action) {
      case 'start':
        if (jobName === 'status-transitions') {
          BackgroundJobService.startJob(
            'status-transitions', 
            () => import('@/lib/trip-status-service').then(m => m.TripStatusService.runDateBasedStatusChecks()),
            30 * 60 * 1000 // 30 minutes
          )
          result.message = `Started job: ${jobName}`
        } else {
          return NextResponse.json(
            { error: `Unknown job: ${jobName}` },
            { status: 400 }
          )
        }
        break

      case 'stop':
        BackgroundJobService.stopJob(jobName)
        result.message = `Stopped job: ${jobName}`
        break

      case 'restart':
        if (jobName === 'status-transitions') {
          BackgroundJobService.stopJob(jobName)
          BackgroundJobService.startJob(
            'status-transitions', 
            () => import('@/lib/trip-status-service').then(m => m.TripStatusService.runDateBasedStatusChecks()),
            30 * 60 * 1000
          )
          result.message = `Restarted job: ${jobName}`
        } else {
          return NextResponse.json(
            { error: `Unknown job: ${jobName}` },
            { status: 400 }
          )
        }
        break

      case 'run-once':
        if (jobName === 'status-transitions') {
          const { TripStatusService } = await import('@/lib/trip-status-service')
          const jobResult = await BackgroundJobService.runJobOnce(
            'status-transitions',
            () => TripStatusService.runDateBasedStatusChecks()
          )
          result = { ...result, ...jobResult }
        } else {
          return NextResponse.json(
            { error: `Unknown job: ${jobName}` },
            { status: 400 }
          )
        }
        break

      case 'start-all':
        BackgroundJobService.startAll()
        result.message = 'Started all background jobs'
        break

      case 'shutdown':
        BackgroundJobService.shutdown()
        result.message = 'Shutdown all background jobs'
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    // Get updated status
    const jobStatus = BackgroundJobService.getJobStatus()
    const healthCheck = await BackgroundJobService.healthCheck()

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      jobs: jobStatus,
      health: healthCheck
    })

  } catch (error) {
    console.error('❌ Error controlling jobs:', error)
    return NextResponse.json(
      {
        error: 'Job control operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
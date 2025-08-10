import { NextRequest, NextResponse } from 'next/server'
import { TripStatusService } from '@/lib/trip-status-service'

// GET /api/system/status-transitions - Run date-based status transitions
// This endpoint can be called by a cron job or scheduled task
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting date-based status transition check...')
    
    // Optional API key verification for security
    const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('key')
    const expectedKey = process.env.SYSTEM_API_KEY
    
    // Only check API key if it's configured (for production security)
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Run the date-based status checks
    const results = await TripStatusService.runDateBasedStatusChecks()

    console.log(`✅ Status transition check completed:`, {
      processed: results.processed,
      successful_transitions: results.transitions.filter(t => t.success).length,
      failed_transitions: results.transitions.filter(t => !t.success).length,
      errors: results.errors.length
    })

    // Log detailed results for monitoring
    results.transitions.forEach(transition => {
      if (transition.success && transition.oldStatus !== transition.newStatus) {
        console.log(`📈 Trip transitioned: ${transition.oldStatus} → ${transition.newStatus}`)
      } else if (!transition.success) {
        console.log(`❌ Transition failed: ${transition.error}`)
      }
    })

    if (results.errors.length > 0) {
      console.warn('⚠️ Errors during status transitions:', results.errors)
    }

    return NextResponse.json({
      success: true,
      processed: results.processed,
      transitions: results.transitions.length,
      successful: results.transitions.filter(t => t.success).length,
      failed: results.transitions.filter(t => !t.success).length,
      errors: results.errors.length,
      details: results.transitions.map(t => ({
        success: t.success,
        oldStatus: t.oldStatus,
        newStatus: t.newStatus,
        reason: t.reason,
        error: t.error
      }))
    })

  } catch (error) {
    console.error('❌ Error in status transition job:', error)
    return NextResponse.json(
      {
        error: 'Status transition job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/system/status-transitions - Force run status transitions (admin only)
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
    const { force = false } = body

    console.log('🔧 Admin-triggered status transition check (force:', force, ')')

    // Run the status checks
    const results = await TripStatusService.runDateBasedStatusChecks()

    // If force is true, also get statistics
    let stats = null
    if (force) {
      stats = await TripStatusService.getStatusStatistics()
    }

    return NextResponse.json({
      success: true,
      processed: results.processed,
      transitions: results.transitions.length,
      successful: results.transitions.filter(t => t.success).length,
      failed: results.transitions.filter(t => !t.success).length,
      errors: results.errors,
      details: results.transitions,
      ...(stats && { statistics: stats })
    })

  } catch (error) {
    console.error('❌ Error in admin status transition:', error)
    return NextResponse.json(
      {
        error: 'Admin status transition failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
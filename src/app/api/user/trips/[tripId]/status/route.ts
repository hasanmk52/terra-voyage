import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { TripStatusService } from '@/lib/trip-status-service'
import { TripStatus } from '@prisma/client'

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = rateLimitMap.get(clientId)
  
  if (!clientData || now - clientData.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientId, { count: 1, lastReset: now })
    return true
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  clientData.count++
  return true
}

// Validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id) || /^[a-zA-Z0-9]{25}$/.test(id) // Also support CUID format
}

// Simple authentication check (placeholder for real auth)
function getAuthenticatedUserId(request: NextRequest): string | null {
  // TODO: Implement real authentication
  // For now, use demo user but add validation
  const authHeader = request.headers.get('authorization')
  const userAgent = request.headers.get('user-agent')
  
  // Basic validation to prevent abuse
  if (!userAgent || userAgent.length < 10) {
    return null
  }
  
  return 'demo-user-001' // Replace with real user ID from JWT/session
}

// Check if user has permission to modify trip
async function checkTripPermission(tripId: string, userId: string): Promise<boolean> {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { userId: true }
  })
  
  if (!trip) {
    return false
  }
  
  // For now, only trip owner can modify
  // TODO: Add collaboration role checking
  return trip.userId === userId
}

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
})

interface RouteParams {
  params: Promise<{ tripId: string }>
}

// PUT /api/user/trips/[tripId]/status - Update trip status manually
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tripId } = await params

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate trip ID format
    if (!isValidUUID(tripId)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      )
    }

    // Validate request body
    const body = await request.json()
    const { status: newStatus } = updateStatusSchema.parse(body)

    // Verify trip exists
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { 
        id: true, 
        status: true, 
        title: true,
        startDate: true,
        endDate: true,
        userId: true
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Authentication
    const userId = getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Authorization - Check if user can modify this trip
    const hasPermission = await checkTripPermission(tripId, userId)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to modify this trip' },
        { status: 403 }
      )
    }

    // Check if the status change is valid
    const isValid = TripStatusService.isTransitionAllowed(trip.status, newStatus as TripStatus)
    if (!isValid) {
      const allowedTransitions = TripStatusService.getAllowedTransitions(trip.status)
      return NextResponse.json(
        { 
          error: `Invalid status transition from ${trip.status} to ${newStatus}`,
          allowedTransitions 
        },
        { status: 400 }
      )
    }

    // Perform the status transition
    const transitionResult = await TripStatusService.manualTransitionStatus(
      tripId,
      newStatus as TripStatus,
      userId,
      'manual',
      {
        previousStatus: trip.status,
        changedAt: new Date().toISOString(),
        tripTitle: trip.title,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    )

    if (!transitionResult.success) {
      return NextResponse.json(
        { 
          error: 'Status transition failed',
          code: 'TRANSITION_FAILED'
        },
        { status: 400 }
      )
    }

    // Get updated trip data
    const updatedTrip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        title: true,
        updatedAt: true
      }
    })

    console.log(`✅ Trip ${tripId} status manually updated from ${transitionResult.oldStatus} to ${transitionResult.newStatus} by user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `Trip status updated to ${newStatus}`,
      trip: updatedTrip,
      transition: {
        oldStatus: transitionResult.oldStatus,
        newStatus: transitionResult.newStatus,
        reason: transitionResult.reason,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid status value',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    console.error('❌ Error updating trip status:', error)
    return NextResponse.json(
      {
        error: 'Failed to update trip status',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// GET /api/user/trips/[tripId]/status - Get current trip status and allowed transitions
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tripId } = await params

    // Rate limiting for GET requests (more lenient)
    const clientId = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(clientId + '-get')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate trip ID format
    if (!isValidUUID(tripId)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      )
    }

    // Get trip status
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { 
        id: true, 
        status: true, 
        title: true,
        updatedAt: true 
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Get allowed transitions
    const allowedTransitions = TripStatusService.getAllowedTransitions(trip.status)
    
    // Get status description
    const statusInfo = TripStatusService.getStatusDescription(trip.status)

    return NextResponse.json({
      trip: {
        id: trip.id,
        title: trip.title,
        status: trip.status,
        updatedAt: trip.updatedAt
      },
      statusInfo,
      allowedTransitions,
      canTransition: allowedTransitions.length > 0
    })

  } catch (error) {
    console.error('❌ Error getting trip status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get trip status',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
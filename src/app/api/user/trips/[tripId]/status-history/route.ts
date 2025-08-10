import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20 // More lenient for read operations

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
  const userAgent = request.headers.get('user-agent')
  
  // Basic validation to prevent abuse
  if (!userAgent || userAgent.length < 10) {
    return null
  }
  
  return 'demo-user-001' // Replace with real user ID from JWT/session
}

// Check if user has permission to view trip
async function checkTripViewPermission(tripId: string, userId: string): Promise<boolean> {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { 
      userId: true,
      isPublic: true,
      collaborations: {
        where: { userId },
        select: { role: true }
      }
    }
  })
  
  if (!trip) {
    return false
  }
  
  // Trip owner can view
  if (trip.userId === userId) {
    return true
  }
  
  // Public trips can be viewed
  if (trip.isPublic) {
    return true
  }
  
  // Collaborators can view
  if (trip.collaborations.length > 0) {
    return true
  }
  
  return false
}

interface RouteParams {
  params: Promise<{ tripId: string }>
}

// GET /api/user/trips/[tripId]/status-history - Get trip status change history
export async function GET(
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

    // Authentication (for viewing trip history)
    const userId = getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Authorization - Check if user can view this trip
    const hasPermission = await checkTripViewPermission(tripId, userId)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view this trip' },
        { status: 403 }
      )
    }

    // Verify trip exists
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { id: true, title: true, status: true }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Get status history with pagination (with additional validation)
    const url = new URL(request.url)
    const page = Math.max(1, Math.min(parseInt(url.searchParams.get('page') || '1'), 1000))
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20'), 100))
    const skip = (page - 1) * limit

    // Fetch status history
    const [statusHistory, total] = await Promise.all([
      db.statusHistory.findMany({
        where: { tripId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      db.statusHistory.count({
        where: { tripId }
      })
    ])

    // Transform the data for better frontend consumption
    const transformedHistory = statusHistory.map(entry => ({
      id: entry.id,
      tripId: entry.tripId,
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      reason: entry.reason,
      timestamp: entry.timestamp,
      createdAt: entry.createdAt,
      user: entry.user ? {
        id: entry.user.id,
        name: entry.user.name,
        // Don't expose email for privacy
        email: entry.user.id === userId ? entry.user.email : null
      } : null,
      metadata: entry.metadata,
      isAutomatic: entry.reason.includes('automatic') || entry.reason.includes('date_based') || entry.reason.includes('system'),
      isManual: entry.reason === 'manual',
      description: generateStatusChangeDescription(entry.oldStatus, entry.newStatus, entry.reason)
    }))

    return NextResponse.json({
      trip: {
        id: trip.id,
        title: trip.title,
        currentStatus: trip.status
      },
      statusHistory: transformedHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalChanges: total,
        automaticChanges: statusHistory.filter(h => 
          h.reason.includes('automatic') || h.reason.includes('date_based') || h.reason.includes('system')
        ).length,
        manualChanges: statusHistory.filter(h => h.reason === 'manual').length
      }
    })

  } catch (error) {
    console.error('❌ Error fetching trip status history:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch status history',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper function to generate human-readable status change descriptions
function generateStatusChangeDescription(
  oldStatus: string | null, 
  newStatus: string, 
  reason: string
): string {
  const statusLabels = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  }

  const oldLabel = oldStatus ? statusLabels[oldStatus as keyof typeof statusLabels] : null
  const newLabel = statusLabels[newStatus as keyof typeof statusLabels] || newStatus

  // Handle different reasons
  switch (reason) {
    case 'trip_created':
      return `Trip created with ${newLabel} status`
      
    case 'itinerary_generated':
      return `Automatically moved to ${newLabel} after itinerary generation`
      
    case 'date_based':
      if (oldStatus === 'PLANNED' && newStatus === 'ACTIVE') {
        return `Automatically activated on trip start date`
      }
      if (oldStatus === 'ACTIVE' && newStatus === 'COMPLETED') {
        return `Automatically completed after trip end date`
      }
      return `Status automatically updated based on trip dates`
      
    case 'system':
    case 'automatic':
      return `System automatically updated status to ${newLabel}`
      
    case 'manual':
      if (oldStatus) {
        return `Manually changed from ${oldLabel} to ${newLabel}`
      }
      return `Manually set to ${newLabel}`
      
    default:
      if (oldStatus) {
        return `Status changed from ${oldLabel} to ${newLabel}`
      }
      return `Status set to ${newLabel}`
  }
}
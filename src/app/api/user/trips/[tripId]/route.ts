import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTripPermissions, getPermissionMessages } from "@/lib/trip-permissions"

const updateTripSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  destination: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  travelers: z.number().int().min(1).max(50).optional(),
  status: z.enum(["DRAFT", "PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  isPublic: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{ tripId: string }>
}

// GET /api/user/trips/[tripId] - Get specific trip
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tripId } = await params

    // Validate tripId
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400 }
      )
    }


    // Get authenticated user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || 'demo-user-001' // Fallback to demo user

    // Use real database
    try {
      const trip = await db.trip.findFirst({
        where: {
          id: tripId,
          OR: [
            { userId: userId }, // User can access their own trips
            { isPublic: true }  // Anyone can access public trips
          ]
        },
        include: {
          days: {
            orderBy: { dayNumber: 'asc' },
            include: {
              activities: {
                orderBy: { order: 'asc' }
              }
            }
          },
          activities: {
            orderBy: [{ dayId: 'asc' }, { order: 'asc' }]
          },
          itineraryData: true,
          _count: {
            select: {
              activities: true,
              days: true,
              collaborations: true,
            }
          }
        }
      })

      if (!trip) {
        return NextResponse.json(
          { error: "Trip not found" },
          { status: 404 }
        )
      }

      // Calculate permissions for the trip  
      const permissions = getTripPermissions(trip, userId)
      const permissionMessages = getPermissionMessages(trip, userId)

      return NextResponse.json({ 
        trip,
        permissions,
        permissionMessages
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Trip fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/user/trips/[tripId] - Update trip
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json()
    const validatedData = updateTripSchema.parse(body)

    // Validate dates if both are provided
    if (validatedData.startDate && validatedData.endDate) {
      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        )
      }
    }

    const { tripId } = await params

    // Check current trip and permissions
    const currentTrip = await db.trip.findUnique({
      where: { id: tripId },
      select: { 
        id: true, 
        status: true, 
        startDate: true, 
        endDate: true, 
        userId: true,
        isPublic: true 
      }
    })

    if (!currentTrip) {
      return NextResponse.json(
        { error: "Trip not found or not accessible" },
        { status: 404 }
      )
    }

    // Get authenticated user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || 'demo-user-001' // Fallback to demo user

    // Check permissions
    const permissions = getTripPermissions(currentTrip, userId)

    if (!permissions.canEdit) {
      const messages = getPermissionMessages(currentTrip, userId)
      return NextResponse.json(
        { 
          error: "Permission denied",
          message: messages.cannotEdit,
          permissions
        },
        { status: 403 }
      )
    }

    // Update trip in database
    const updatedTrip = await db.trip.update({
      where: { 
        id: tripId,
        userId: userId // Only allow updating your own trips
      },
      data: validatedData,
      include: {
        _count: {
          select: {
            activities: true,
            collaborations: true,
          }
        }
      }
    })

    if (!updatedTrip) {
      return NextResponse.json(
        { error: "Trip not found or not accessible" },
        { status: 404 }
      )
    }

    return NextResponse.json({ trip: updatedTrip })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Trip update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/user/trips/[tripId] - Delete trip
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tripId } = await params
    // Validate tripId
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400 }
      )
    }

    // Check current trip and permissions
    const currentTrip = await db.trip.findUnique({
      where: { id: tripId },
      select: { 
        id: true, 
        status: true, 
        startDate: true, 
        endDate: true, 
        userId: true,
        isPublic: true 
      }
    })

    if (!currentTrip) {
      return NextResponse.json(
        { error: "Trip not found or not accessible" },
        { status: 404 }
      )
    }

    // Get authenticated user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || 'demo-user-001' // Fallback to demo user

    // Check permissions
    const permissions = getTripPermissions(currentTrip, userId)

    if (!permissions.canDelete) {
      const messages = getPermissionMessages(currentTrip, userId)
      return NextResponse.json(
        { 
          error: "Permission denied",
          message: messages.cannotDelete,
          permissions
        },
        { status: 403 }
      )
    }

    // Delete trip from database
    const deletedTrip = await db.trip.delete({
      where: { 
        id: tripId,
        userId: userId // Only allow deleting your own trips
      }
    })

    if (!deletedTrip) {
      return NextResponse.json(
        { error: "Trip not found or not accessible" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Trip deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
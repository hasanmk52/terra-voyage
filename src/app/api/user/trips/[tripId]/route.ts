import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

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


    // Use real database
    try {
      const trip = await db.trip.findFirst({
        where: {
          id: tripId,
          isPublic: true // Only return public trips for security
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

      return NextResponse.json({ trip })
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

    // Update trip in database
    const updatedTrip = await db.trip.update({
      where: { 
        id: tripId,
        isPublic: true // Only allow updating public trips for security
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

    // Delete trip from database
    const deletedTrip = await db.trip.delete({
      where: { 
        id: tripId,
        isPublic: true // Only allow deleting public trips for security
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
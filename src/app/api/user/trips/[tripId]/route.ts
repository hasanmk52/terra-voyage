import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { useMocks } from "@/lib/mock-data"

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
  params: { tripId: string }
}

// GET /api/user/trips/[tripId] - Get specific trip
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Use mock implementation for simplified experience
    if (useMocks) {
      const mockTrip = {
        id: params.tripId,
        title: "Paris Adventure",
        destination: "Paris, France",
        description: "Exploring the City of Light",
        startDate: "2024-06-15T00:00:00.000Z",
        endDate: "2024-06-20T00:00:00.000Z",
        budget: 2000,
        travelers: 2,
        status: "PLANNED",
        isPublic: false,
        userId: "guest-user",
        createdAt: "2024-01-15T00:00:00.000Z",
        updatedAt: "2024-01-15T00:00:00.000Z",
        activities: [],
        collaborations: [],
        user: {
          id: "guest-user",
          name: "Guest User",
          email: "guest@example.com",
          image: null
        },
        _count: {
          comments: 0,
          votes: 0,
        }
      }

      return NextResponse.json({ trip: mockTrip })
    }

    // Note: Database functionality disabled for simplified experience
    return NextResponse.json({ error: "Database functionality not available in simplified mode" }, { status: 503 })
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

    // Use mock implementation for simplified experience
    if (useMocks) {
      const mockUpdatedTrip = {
        id: params.tripId,
        title: validatedData.title || "Updated Trip",
        destination: validatedData.destination || "Updated Destination",
        description: validatedData.description || "Updated description",
        startDate: validatedData.startDate || "2024-06-15T00:00:00.000Z",
        endDate: validatedData.endDate || "2024-06-20T00:00:00.000Z",
        budget: validatedData.budget || 2000,
        travelers: validatedData.travelers || 2,
        status: validatedData.status || "PLANNED",
        isPublic: validatedData.isPublic || false,
        userId: "guest-user",
        updatedAt: new Date().toISOString(),
        _count: {
          activities: 0,
          collaborations: 0,
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300))
      return NextResponse.json({ trip: mockUpdatedTrip })
    }

    // Note: Database functionality disabled for simplified experience
    return NextResponse.json({ error: "Database functionality not available in simplified mode" }, { status: 503 })
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
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Use mock implementation for simplified experience
    if (useMocks) {
      // Simulate deletion
      await new Promise(resolve => setTimeout(resolve, 200))
      console.log("✅ Mock trip deleted:", params.tripId)
      return NextResponse.json({ success: true })
    }

    // Note: Database functionality disabled for simplified experience
    return NextResponse.json({ error: "Database functionality not available in simplified mode" }, { status: 503 })
  } catch (error) {
    console.error("Trip deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
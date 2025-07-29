import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { useMockDatabase } from "@/lib/selective-mocks"
import { simulateDelay } from "@/lib/mock-data"
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
  params: { tripId: string }
}

// GET /api/user/trips/[tripId] - Get specific trip
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tripId = params.tripId

    // Validate tripId
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400 }
      )
    }

    // Use mock implementation when database is mocked
    if (useMockDatabase) {
      await simulateDelay("database")
      
      // Generate mock trip based on tripId to simulate different destinations
      const mockDestinations = [
        { name: "Tokyo, Japan", coords: { lat: 35.6762, lng: 139.6503 } },
        { name: "New York, NY, USA", coords: { lat: 40.7128, lng: -74.0060 } },
        { name: "London, UK", coords: { lat: 51.5074, lng: -0.1278 } },
        { name: "Dubai, UAE", coords: { lat: 25.2048, lng: 55.2708 } },
        { name: "Sydney, Australia", coords: { lat: -33.8688, lng: 151.2093 } },
        { name: "Paris, France", coords: { lat: 48.8566, lng: 2.3522 } },
        { name: "Rome, Italy", coords: { lat: 41.9028, lng: 12.4964 } },
        { name: "Barcelona, Spain", coords: { lat: 41.3851, lng: 2.1734 } }
      ]
      
      // Use tripId hash to select consistent destination for same trip
      const destinationIndex = Math.abs(tripId.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)) % mockDestinations.length
      const selectedDestination = mockDestinations[destinationIndex]
      
      const mockTrip = {
        id: tripId,
        title: `Amazing ${selectedDestination.name.split(',')[0]} Adventure`,
        destination: selectedDestination.name,
        destinationCoords: selectedDestination.coords,
        description: `Exploring the best of ${selectedDestination.name.split(',')[0]}`,
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

    // Use real database
    try {
      const trip = await db.trip.findFirst({
        where: {
          id: tripId,
          isPublic: true // Only return public trips for security
        },
        select: {
          id: true,
          title: true,
          destination: true,
          description: true,
          startDate: true,
          endDate: true,
          budget: true,
          travelers: true,
          status: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              activities: true,
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
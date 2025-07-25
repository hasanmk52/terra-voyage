import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { useMockDatabase } from "@/lib/selective-mocks"
import { simulateDelay } from "@/lib/mock-data"

const createTripSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().positive().optional(),
  travelers: z.number().int().min(1).max(50).default(1),
  isPublic: z.boolean().default(false),
})

// GET /api/user/trips - Get user's trips
export async function GET(request: NextRequest) {
  try {
    // Use mock implementation for simplified experience
    if (useMockDatabase) {
      const mockTrips = [
        {
          id: "mock-trip-1",
          title: "Paris Adventure",
          destination: "Paris, France",
          description: "Exploring the City of Light",
          startDate: "2024-06-15T00:00:00.000Z",
          endDate: "2024-06-20T00:00:00.000Z",
          budget: 2000,
          travelers: 2,
          status: "PLANNED",
          isPublic: false,
          createdAt: "2024-01-15T00:00:00.000Z",
          updatedAt: "2024-01-15T00:00:00.000Z",
          _count: {
            activities: 12,
            collaborations: 1
          }
        }
      ]

      return NextResponse.json({
        trips: mockTrips,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        }
      })
    }

    // Note: Database functionality disabled for simplified experience
    return NextResponse.json({ error: "Database functionality not available in simplified mode" }, { status: 503 })
  } catch (error) {
    // Trips fetch error
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/user/trips - Create new trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createTripSchema.parse(body)

    // Validate dates
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Use mock implementation for simplified experience
    if (useMockDatabase) {
      // Simulate trip creation with mock response
      const mockTrip = {
        id: `mock-trip-${Date.now()}`,
        ...validatedData,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: "PLANNED",
        userId: "guest-user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: {
          activities: 0,
          collaborations: 0,
        }
      }

      // Simulate delay like a real API
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock trip created successfully
      return NextResponse.json({ trip: mockTrip }, { status: 201 })
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

    // Trip creation error
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { useMockDatabase } from "@/lib/selective-mocks"
import { simulateDelay } from "@/lib/mock-data"
import { db } from "@/lib/db"

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
    // Input validation and sanitization
    const url = new URL(request.url)
    const pageParam = url.searchParams.get('page')
    const limitParam = url.searchParams.get('limit')
    
    // Validate and sanitize pagination parameters
    const page = Math.max(1, Math.min(1000, parseInt(pageParam || '1') || 1))
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '10') || 10))
    const skip = (page - 1) * limit

    // Validate numeric inputs to prevent injection
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      )
    }

    // Use mock implementation when database is mocked
    if (useMockDatabase) {
      await simulateDelay("database")
      
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

    // Use real database
    // Security: Only return public trips or implement proper authentication
    // For demo purposes, only return public trips to prevent data exposure
    const [trips, total] = await Promise.all([
      db.trip.findMany({
        where: {
          isPublic: true // Only return public trips for security
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          // Only select safe fields, exclude sensitive information
          id: true,
          title: true,
          destination: true,
          description: true,
          startDate: true,
          endDate: true,
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
          // Excluded: userId, budget, coverImage (sensitive data)
        }
      }),
      db.trip.count({
        where: {
          isPublic: true
        }
      })
    ])

    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        pages,
      }
    })
  } catch (error) {
    console.error("Trips fetch error:", error)
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

    // Validate dates with additional security checks
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)
    
    // Security: Validate date inputs to prevent injection and unreasonable values
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Security: Prevent creating trips too far in the future (prevents abuse)
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2)
    
    if (startDate > maxFutureDate) {
      return NextResponse.json(
        { error: "Trip start date cannot be more than 2 years in the future" },
        { status: 400 }
      )
    }

    // Security: Prevent creating trips in the distant past
    const minPastDate = new Date()
    minPastDate.setFullYear(minPastDate.getFullYear() - 1)
    
    if (endDate < minPastDate) {
      return NextResponse.json(
        { error: "Trip cannot be more than 1 year in the past" },
        { status: 400 }
      )
    }

    // Use mock implementation when database is mocked
    if (useMockDatabase) {
      await simulateDelay("database")
      
      // Simulate trip creation with mock response (only if database is actually mocked)
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

      return NextResponse.json({ trip: mockTrip }, { status: 201 })
    }

    // Use real database
    // Security: For demo purposes without authentication, create public trips only
    // In production, this should require authentication and user validation
    
    // Security: Limit trip creation frequency (basic rate limiting)
    const recentTripsCount = await db.trip.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
        }
      }
    })
    
    if (recentTripsCount > 10) {
      return NextResponse.json(
        { error: "Too many trips created recently. Please try again later." },
        { status: 429 }
      )
    }

    const trip = await db.trip.create({
      data: {
        ...validatedData,
        startDate,
        endDate,
        userId: 'public-demo-user', // Use public demo user for security
        isPublic: true, // Force public for demo security
      },
      select: {
        // Security: Only return safe fields
        id: true,
        title: true,
        destination: true,
        description: true,
        startDate: true,
        endDate: true,
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
        // Excluded: userId (sensitive data)
      }
    })

    return NextResponse.json({ trip }, { status: 201 })
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
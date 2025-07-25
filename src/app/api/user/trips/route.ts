import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")

    const skip = (page - 1) * limit

    const where = {
      userId: session.user.id,
      ...(status && { status: status.toUpperCase() }),
    }

    const [trips, total] = await Promise.all([
      db.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { status: "asc" },
          { startDate: "desc" },
        ],
        include: {
          _count: {
            select: {
              activities: true,
              collaborations: true,
            }
          }
        },
      }),
      db.trip.count({ where }),
    ])

    return NextResponse.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const trip = await db.trip.create({
      data: {
        ...validatedData,
        startDate,
        endDate,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            activities: true,
            collaborations: true,
          }
        }
      },
    })

    return NextResponse.json({ trip }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Trip creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
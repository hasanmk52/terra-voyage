import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const trip = await db.trip.findFirst({
      where: {
        id: params.tripId,
        OR: [
          { userId: session.user.id },
          {
            collaborations: {
              some: {
                userId: session.user.id,
                acceptedAt: { not: null },
              }
            }
          }
        ]
      },
      include: {
        activities: {
          orderBy: [
            { order: "asc" },
            { startTime: "asc" },
          ]
        },
        collaborations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        _count: {
          select: {
            comments: true,
            votes: true,
          }
        }
      },
    })

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    return NextResponse.json({ trip })
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user owns the trip or has admin/editor permissions
    const existingTrip = await db.trip.findFirst({
      where: {
        id: params.tripId,
        OR: [
          { userId: session.user.id },
          {
            collaborations: {
              some: {
                userId: session.user.id,
                role: { in: ["ADMIN", "EDITOR"] },
                acceptedAt: { not: null },
              }
            }
          }
        ]
      },
    })

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found or insufficient permissions" },
        { status: 404 }
      )
    }

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

    const updateData = {
      ...validatedData,
      ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
      ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
    }

    const updatedTrip = await db.trip.update({
      where: { id: params.tripId },
      data: updateData,
      include: {
        _count: {
          select: {
            activities: true,
            collaborations: true,
          }
        }
      },
    })

    return NextResponse.json({ trip: updatedTrip })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only trip owner can delete
    const trip = await db.trip.findFirst({
      where: {
        id: params.tripId,
        userId: session.user.id,
      },
    })

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found or insufficient permissions" },
        { status: 404 }
      )
    }

    await db.trip.delete({
      where: { id: params.tripId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Trip deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
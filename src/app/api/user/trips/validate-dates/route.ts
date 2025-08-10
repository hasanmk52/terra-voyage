import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { TripOverlapService } from "@/lib/trip-overlap-service"

const validateDatesSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  userId: z.string().optional(), // Optional for demo purposes
  excludeTripId: z.string().optional(), // For editing existing trips
})

// POST /api/user/trips/validate-dates - Validate trip dates for overlaps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = validateDatesSchema.parse(body)

    // Validate dates
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { 
          isValid: false,
          errors: ["End date must be after start date"],
          hasOverlap: false
        },
        { status: 200 }
      )
    }

    // For demo purposes, use default user
    const userId = validatedData.userId || 'demo-user-001'
    
    // Get overlap details
    const overlapResult = await TripOverlapService.getOverlapDetails(
      userId,
      startDate,
      endDate,
      validatedData.excludeTripId
    )
    
    if (overlapResult.hasOverlap) {
      // Get alternative date suggestions
      const suggestions = await TripOverlapService.suggestAlternativeDates(
        userId,
        startDate,
        endDate
      )
      
      return NextResponse.json({
        isValid: false,
        hasOverlap: true,
        overlappingTrips: overlapResult.overlappingTrips.map(trip => ({
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate
        })),
        overlapDetails: overlapResult.overlapDetails,
        suggestedDates: suggestions.map(suggestion => ({
          startDate: suggestion.startDate,
          endDate: suggestion.endDate,
          duration: Math.ceil((suggestion.endDate.getTime() - suggestion.startDate.getTime()) / (1000 * 60 * 60 * 24))
        })),
        errors: [
          `Your selected dates overlap with ${overlapResult.overlappingTrips.length} existing trip${overlapResult.overlappingTrips.length > 1 ? 's' : ''}. Please choose different dates.`
        ]
      })
    }
    
    // Dates are valid
    return NextResponse.json({
      isValid: true,
      hasOverlap: false,
      message: "Dates are available for booking"
    })

  } catch (error) {
    console.error("Date validation error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid input",
          details: error.errors.map((e: any) => e.message)
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
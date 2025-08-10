import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { itineraryService } from '@/lib/itinerary-service'
import { TripStatusService } from '@/lib/trip-status-service'

// Helper function to map AI activity types to database enum
function mapActivityType(aiType: string): string {
  const typeMapping: Record<string, string> = {
    'attraction': 'ATTRACTION',
    'restaurant': 'RESTAURANT',
    'experience': 'EXPERIENCE',
    'transportation': 'TRANSPORTATION',
    'accommodation': 'ACCOMMODATION',
    'museum': 'ATTRACTION', // Museums are attractions
    'shopping': 'SHOPPING',
    'dining': 'RESTAURANT',
    'sightseeing': 'ATTRACTION',
    'leisure': 'EXPERIENCE',
    'other': 'OTHER'
  }
  
  return typeMapping[aiType.toLowerCase()] || 'OTHER'
}

interface RouteParams {
  params: Promise<{ tripId: string }>
}

// POST /api/user/trips/[tripId]/generate-itinerary - Manually trigger itinerary generation
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tripId } = await params

    console.log('Starting manual itinerary generation for trip:', tripId)

    // Get trip data
    const trip = await db.trip.findUnique({
      where: { id: tripId }
    })

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      )
    }

    console.log('Found trip:', trip.title)

    // Prepare form data for itinerary service
    const validatedData = {
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      budget: trip.budget,
      travelers: trip.travelers,
      interests: ['culture', 'food', 'sightseeing'],
      accommodationType: 'hotel'
    }

    const destinationCoords = trip.destinationCoords as { lat: number; lng: number } || { lat: 17.3850, lng: 78.4867 }

    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    // Create form data for itinerary service
    const formData = {
      destination: {
        destination: validatedData.destination,
        coordinates: destinationCoords
      },
      dateRange: {
        startDate,
        endDate
      },
      budget: {
        amount: validatedData.budget || 2000,
        currency: 'USD',
        range: 'total' as const
      },
      interests: validatedData.interests || ['culture', 'food'],
      preferences: {
        pace: 'moderate' as const,
        accommodationType: (validatedData.accommodationType || 'mid-range') as 'budget' | 'mid-range' | 'luxury' | 'mixed',
        transportation: 'public' as const,
        accessibility: false,
        dietaryRestrictions: [],
        specialRequests: ''
      },
      travelers: {
        adults: validatedData.travelers,
        children: 0,
        infants: 0
      }
    }

    console.log('Calling AI service with form data:', JSON.stringify(formData, null, 2))

    // Generate itinerary using AI service
    const itineraryResult = await itineraryService.generateItinerary(formData, {
      prioritizeSpeed: false,
      useCache: true,
      fallbackOnTimeout: true // Enable fallback to debug
    })

    console.log('AI service response received:', {
      hasItinerary: !!itineraryResult.itinerary,
      itineraryKeys: itineraryResult.itinerary ? Object.keys(itineraryResult.itinerary) : [],
      metadata: itineraryResult.metadata,
      performance: itineraryResult.performance,
      warnings: itineraryResult.warnings
    })

    // Save itinerary data to database
    await db.$transaction(async (tx) => {
      console.log('Starting database transaction...')

      // Delete existing itinerary data if any
      await tx.itineraryData.deleteMany({
        where: { tripId }
      })

      await tx.activity.deleteMany({
        where: { tripId }
      })

      await tx.day.deleteMany({
        where: { tripId }
      })

      // Save complete itinerary data
      await tx.itineraryData.create({
        data: {
          tripId,
          rawData: itineraryResult.itinerary,
          metadata: itineraryResult.metadata || {},
          generalTips: itineraryResult.itinerary?.itinerary?.generalTips || [],
          emergencyInfo: itineraryResult.itinerary?.itinerary?.emergencyInfo || {},
          budgetBreakdown: itineraryResult.itinerary?.itinerary?.totalBudgetEstimate?.breakdown || {}
        }
      })

      console.log('Itinerary data saved')

      // Save days and activities if they exist
      if (itineraryResult.itinerary?.itinerary?.days) {
        for (const dayData of itineraryResult.itinerary.itinerary.days) {
          try {
            console.log(`Processing day ${dayData.day}...`)

            const day = await tx.day.create({
              data: {
                tripId,
                dayNumber: dayData.day || 1,
                date: dayData.date || new Date().toISOString().split('T')[0],
                theme: dayData.theme || 'Day activities',
                dailyBudget: dayData.dailyBudget || null,
                transportation: dayData.transportation || null
              }
            })

            console.log(`Day ${dayData.day} saved with ID: ${day.id}`)

            // Save activities for this day
            if (dayData.activities && Array.isArray(dayData.activities)) {
              for (const [index, activityData] of dayData.activities.entries()) {
                try {
                  const activity = await tx.activity.create({
                    data: {
                      tripId,
                      dayId: day.id,
                      name: activityData.name || 'Unnamed Activity',
                      description: activityData.description || '',
                      location: activityData.location?.name || '',
                      address: activityData.location?.address || '',
                      coordinates: activityData.location?.coordinates || null,
                      startTime: activityData.startTime || '',
                      endTime: activityData.endTime || '',
                      timeSlot: activityData.timeSlot || 'morning',
                      type: mapActivityType(activityData.type || 'other') as any,
                      price: activityData.pricing?.amount || null,
                      currency: activityData.pricing?.currency || 'USD',
                      priceType: activityData.pricing?.priceType || 'per_person',
                      duration: activityData.duration || '',
                      tips: Array.isArray(activityData.tips) ? activityData.tips : [],
                      bookingRequired: Boolean(activityData.bookingRequired),
                      accessibility: activityData.accessibility || {},
                      order: index
                    }
                  })

                  console.log(`Activity ${index + 1} saved: ${activity.name}`)
                } catch (activityError) {
                  console.error(`Error saving activity ${index} for day ${dayData.day}:`, activityError)
                }
              }
            }
          } catch (dayError) {
            console.error(`Error saving day ${dayData.day}:`, dayError)
          }
        }
      }

      console.log('Transaction completed successfully')
    })

    console.log('✅ Itinerary generated and saved successfully!')

    // Automatically transition status from DRAFT to PLANNED after successful itinerary generation
    try {
      const statusTransition = await TripStatusService.autoTransitionStatus(
        tripId,
        'itinerary_generated',
        {
          daysGenerated: itineraryResult.itinerary?.itinerary?.days?.length || 0,
          activitiesGenerated: itineraryResult.itinerary?.itinerary?.days?.reduce((total, day) => 
            total + (day.activities?.length || 0), 0
          ) || 0,
          generationMethod: itineraryResult.metadata?.generationMethod,
          regeneratedAt: new Date().toISOString(),
          manual: true // This was manually triggered
        }
      )

      if (statusTransition.success && statusTransition.oldStatus !== statusTransition.newStatus) {
        console.log(`Status successfully transitioned from ${statusTransition.oldStatus} to ${statusTransition.newStatus} for trip ${tripId}`)
      }
    } catch (statusError) {
      console.error('Error transitioning trip status:', statusError)
      // Don't fail the entire operation if status transition fails
    }

    return NextResponse.json({
      success: true,
      message: 'Itinerary generated successfully',
      itinerary: itineraryResult
    })

  } catch (error) {
    console.error('❌ Error generating itinerary:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })

    return NextResponse.json(
      { 
        error: "Failed to generate itinerary",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
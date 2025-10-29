import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { itineraryService } from '@/lib/itinerary-service'
import { TripStatusService } from '@/lib/trip-status-service'
import { 
  RetryProgress, 
  createCancellationToken,
  RetryCancelledException,
  RetryExhaustedException 
} from '@/lib/retry-logic'

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
      currency: 'USD', // Always USD
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
        currency: 'USD', // Always USD
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

    // Create cancellation token for potential retry cancellation
    const cancellationToken = createCancellationToken()
    
    // Progress tracking for retry system (FR-003.2)
    const progressCallback = (progress: RetryProgress) => {
      console.log(`Generation progress: Attempt ${progress.currentAttempt}/${progress.maxAttempts}`, {
        isRetrying: progress.isRetrying,
        error: progress.error,
        nextRetryDelay: progress.nextRetryDelay
      })
      // In a real implementation, you might want to send progress via WebSocket or SSE
    }

    // Generate itinerary using AI service with retry support
    const itineraryResult = await itineraryService.generateItinerary(formData, {
      prioritizeSpeed: false,
      useCache: true,
      onProgress: progressCallback,
      cancellationToken
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
        console.log(`Processing ${itineraryResult.itinerary.itinerary.days.length} days...`)

        // Prepare all days data upfront
        const daysData = itineraryResult.itinerary.itinerary.days.map((dayData, idx) => ({
          tripId,
          dayNumber: dayData.day || idx + 1,
          date: dayData.date || new Date().toISOString().split('T')[0],
          theme: dayData.theme || 'Day activities',
          dailyBudget: dayData.dailyBudget || null,
          transportation: dayData.transportation || null
        }))

        // Batch create ALL days in a single query
        await tx.day.createMany({
          data: daysData,
          skipDuplicates: true
        })

        console.log(`✅ Created ${daysData.length} days in batch`)

        // Fetch created days to get IDs for activity mapping
        const createdDays = await tx.day.findMany({
          where: { tripId },
          orderBy: { dayNumber: 'asc' },
          select: { id: true, dayNumber: true }
        })

        // Create day ID lookup map
        const dayIdMap = new Map(
          createdDays.map(day => [day.dayNumber, day.id])
        )

        // Prepare ALL activities data upfront
        const allActivitiesData: any[] = []
        for (let dayIndex = 0; dayIndex < itineraryResult.itinerary.itinerary.days.length; dayIndex++) {
          const dayData = itineraryResult.itinerary.itinerary.days[dayIndex]
          const dayId = dayIdMap.get(dayData.day || dayIndex + 1)

          if (!dayId) {
            console.warn(`Day ID not found for day ${dayData.day || dayIndex + 1}`)
            continue
          }

          if (dayData.activities && Array.isArray(dayData.activities)) {
            dayData.activities.forEach((activityData, activityIndex) => {
              allActivitiesData.push({
                tripId,
                dayId,
                name: activityData.name || 'Unnamed Activity',
                description: activityData.description || '',
                location: activityData.location?.name || '',
                address: activityData.location?.address || '',
                coordinates: activityData.location?.coordinates || null,
                startTime: activityData.startTime || '',
                endTime: activityData.endTime || '',
                timeSlot: activityData.timeSlot || 'morning',
                type: mapActivityType(activityData.type || 'other'),
                price: activityData.pricing?.amount || null,
                currency: 'USD',
                priceType: activityData.pricing?.priceType || 'per_person',
                duration: activityData.duration || '',
                tips: Array.isArray(activityData.tips) ? activityData.tips : [],
                bookingRequired: Boolean(activityData.bookingRequired),
                accessibility: activityData.accessibility || {},
                order: activityIndex
              })
            })
          }
        }

        // Batch create ALL activities (in batches of 100 to avoid payload limits)
        if (allActivitiesData.length > 0) {
          const batchSize = 100
          let totalCreated = 0

          for (let i = 0; i < allActivitiesData.length; i += batchSize) {
            const batch = allActivitiesData.slice(i, i + batchSize)
            await tx.activity.createMany({
              data: batch,
              skipDuplicates: true
            })
            totalCreated += batch.length
          }

          console.log(`✅ Created ${totalCreated} activities in ${Math.ceil(allActivitiesData.length / batchSize)} batch(es)`)
        }
      }

      console.log('Transaction completed successfully')
    }, {
      timeout: 30000, // 30 second timeout
      maxWait: 3000   // 3 second max wait for transaction to start
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

    // FR-003.5: Categorized error handling for retry failure escalation
    let statusCode = 500
    let errorMessage = "Failed to generate itinerary"
    let errorDetails = error instanceof Error ? error.message : 'Unknown error'

    if (error instanceof RetryCancelledException) {
      statusCode = 499 // Client Closed Request
      errorMessage = "Generation cancelled"
      errorDetails = "The itinerary generation was cancelled by the user"
    } else if (error instanceof RetryExhaustedException) {
      statusCode = 503 // Service Unavailable
      errorMessage = "Generation failed after retries"
      errorDetails = `Failed after ${error.attempts.length} attempts. Please try again later.`
      
      // Extract last error for better user feedback
      if (error.lastError?.message) {
        if (error.lastError.message.includes('AI_QUOTA_EXCEEDED')) {
          errorDetails = "AI service quota exceeded. Please try again later."
        } else if (error.lastError.message.includes('AI_SERVICE_TIMEOUT')) {
          errorDetails = "AI service is taking too long. Please try again later."
        } else if (error.lastError.message.includes('RATE_LIMIT_ERROR')) {
          errorDetails = "Too many requests. Please wait a moment and try again."
        } else if (error.lastError.message.includes('AUTHENTICATION_ERROR')) {
          statusCode = 401
          errorDetails = "Authentication failed. Please check your account settings."
        }
      }
    } else if (error instanceof Error) {
      // Handle other specific error types
      if (error.message.includes('timeout')) {
        statusCode = 408
        errorMessage = "Request timeout"
        errorDetails = "The request took too long. Please try again."
      } else if (error.message.includes('not found')) {
        statusCode = 404
        errorMessage = "Trip not found"
        errorDetails = "The specified trip could not be found."
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        retryable: statusCode >= 500 && statusCode < 600, // Server errors are retryable
        category: error instanceof RetryCancelledException ? 'cancelled' : 
                 error instanceof RetryExhaustedException ? 'retry_exhausted' : 'unknown'
      },
      { status: statusCode }
    )
  }
}
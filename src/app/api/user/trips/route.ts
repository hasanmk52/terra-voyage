import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { itineraryService } from "@/lib/itinerary-service"

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

const createTripSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().positive().optional(),
  travelers: z.number().int().min(1).max(50).default(1),
  isPublic: z.boolean().default(false),
  generateItinerary: z.boolean().default(true), // Add option to generate itinerary
  interests: z.array(z.string()).optional(), // Add interests for itinerary generation
  accommodationType: z.string().optional(), // Add accommodation preference
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

    // Use real database with optimized query
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
          // Only select essential fields for listing performance
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
          budget: true, // Include budget for display
          // Remove _count to improve performance - can be calculated if needed
        }
      }),
      db.trip.count({
        where: {
          isPublic: true
        }
      })
    ])

    const pages = Math.ceil(total / limit)

    const response = NextResponse.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        pages,
      }
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
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

    // Get real destination coordinates from Mapbox API
    const destinationCoords = await getDestinationCoordinatesFromAPI(validatedData.destination)
    
    // Generate itinerary SYNCHRONOUSLY before saving to database
    let itineraryResult = null
    
    if (validatedData.generateItinerary) {
      try {
        console.log('Generating itinerary synchronously for:', validatedData.destination)
        
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
        
        // Generate itinerary using AI service synchronously
        itineraryResult = await itineraryService.generateItinerary(formData, {
          prioritizeSpeed: false, // Generate high-quality itinerary
          useCache: true,
          fallbackOnTimeout: false, // Don't use fallbacks - let errors bubble up
          maxTimeout: 240000 // 4 minutes - enough time for proper generation
        })
        
        console.log('Itinerary generated successfully:', {
          destination: validatedData.destination,
          daysCount: itineraryResult.itinerary?.itinerary?.days?.length || 0,
          method: itineraryResult.metadata.generationMethod
        })
      } catch (error) {
        console.error('❌ Itinerary generation failed:', error)
        
        // Provide detailed error message to user
        let errorMessage = 'Failed to generate itinerary'
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorMessage = 'Itinerary generation timed out. The AI service may be busy. Please try again.'
          } else if (error.message.includes('quota') || error.message.includes('rate')) {
            errorMessage = 'AI service is temporarily unavailable due to usage limits. Please try again later.'
          } else if (error.message.includes('key') || error.message.includes('authentication')) {
            errorMessage = 'AI service configuration error. Please contact support.'
          } else if (error.message.includes('validation')) {
            errorMessage = `Itinerary validation failed: ${error.message}`
          } else if (error.message.includes('coordinates') || error.message.includes('location')) {
            errorMessage = `Location error: ${error.message}`
          } else {
            errorMessage = `AI generation error: ${error.message}`
          }
        }
        
        // Return error instead of continuing without itinerary
        return NextResponse.json(
          { 
            error: errorMessage,
            details: error instanceof Error ? error.message : 'Unknown error',
            destination: validatedData.destination
          },
          { status: 500 }
        )
      }
    }

    // Create trip first, then save itinerary data separately to avoid transaction timeout
    const trip = await db.$transaction(async (tx) => {
      // Ensure demo user exists (upsert)
      await tx.user.upsert({
        where: { id: 'demo-user-001' },
        update: {}, // Don't update if exists
        create: {
          id: 'demo-user-001',
          email: 'demo@terravoyage.com',
          name: 'Terra Voyage Demo User',
          image: null,
          emailVerified: new Date(),
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        }
      })
      
      // Create the trip
      return await tx.trip.create({
        data: {
          title: validatedData.title,
          destination: validatedData.destination,
          description: validatedData.description,
          startDate,
          endDate,
          budget: validatedData.budget,
          travelers: validatedData.travelers,
          isPublic: validatedData.isPublic || true, // Default to public for demo
          destinationCoords,
          userId: 'demo-user-001', // Default demo user for public trips
        },
        select: {
          id: true,
          title: true,
          destination: true,
          destinationCoords: true,
          description: true,
          startDate: true,
          endDate: true,
          travelers: true,
          status: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        }
      })
    })

    // Save itinerary data separately if generated
    if (itineraryResult && itineraryResult.itinerary?.itinerary?.days) {
      try {
        await db.$transaction(async (tx) => {
          // Save complete itinerary data
          await tx.itineraryData.create({
            data: {
              tripId: trip.id,
              rawData: itineraryResult.itinerary,
              metadata: itineraryResult.metadata,
              generalTips: itineraryResult.itinerary.itinerary.generalTips || [],
              emergencyInfo: itineraryResult.itinerary.itinerary.emergencyInfo || {},
              budgetBreakdown: itineraryResult.itinerary.itinerary.totalBudgetEstimate?.breakdown || {}
            }
          })
          
          // Prepare batch data for days and activities
          const daysData = itineraryResult.itinerary.itinerary.days.map((dayData) => ({
            tripId: trip.id,
            dayNumber: dayData.day || 1,
            date: dayData.date || new Date().toISOString().split('T')[0],
            theme: dayData.theme || 'Day activities',
            dailyBudget: dayData.dailyBudget || null,
            transportation: dayData.transportation || null
          }))

          // Create days in batch
          const createdDays = await Promise.all(
            daysData.map(dayData => tx.day.create({ data: dayData }))
          )

          // Prepare activities data with dayId mapping
          const activitiesData = []
          for (let dayIndex = 0; dayIndex < itineraryResult.itinerary.itinerary.days.length; dayIndex++) {
            const dayData = itineraryResult.itinerary.itinerary.days[dayIndex]
            const createdDay = createdDays[dayIndex]
            
            if (dayData.activities && Array.isArray(dayData.activities)) {
              dayData.activities.forEach((activityData, activityIndex) => {
                activitiesData.push({
                  tripId: trip.id,
                  dayId: createdDay.id,
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
                  order: activityIndex
                })
              })
            }
          }

          // Create activities in batches to avoid overwhelming the transaction
          const batchSize = 10
          for (let i = 0; i < activitiesData.length; i += batchSize) {
            const batch = activitiesData.slice(i, i + batchSize)
            await Promise.all(
              batch.map(activityData => tx.activity.create({ data: activityData }))
            )
          }
        }, {
          timeout: 60000, // 60 second timeout
          maxWait: 5000,  // 5 second max wait for transaction to start
        })
        
        console.log('Itinerary data saved successfully for trip:', trip.id)
      } catch (itineraryError) {
        console.error('Error saving itinerary data:', itineraryError)
        // Trip still exists without itinerary data
      }
    }

    // Get final trip data with counts
    const finalTrip = await db.trip.findUnique({
      where: { id: trip.id },
      select: {
        id: true,
        title: true,
        destination: true,
        destinationCoords: true,
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
            days: true,
            collaborations: true,
          }
        }
      }
    })

    return NextResponse.json({ 
      trip: finalTrip,
      message: itineraryResult 
        ? `Trip created successfully with ${itineraryResult.itinerary?.itinerary?.days?.length || 0} days of itinerary!`
        : 'Trip created successfully.'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    // Trip creation error
    console.error('Trip creation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Get real destination coordinates from Mapbox Geocoding API
async function getDestinationCoordinatesFromAPI(destination: string): Promise<{ lat: number; lng: number }> {
  try {
    const { MapboxService } = await import('@/lib/mapbox-config')
    const mapboxService = new MapboxService()
    const geocodeResponse = await mapboxService.getLocations(destination)
    
    if (geocodeResponse.features && geocodeResponse.features.length > 0) {
      const [lng, lat] = geocodeResponse.features[0].center
      console.log(`✅ Got real coordinates for ${destination}:`, { lat, lng })
      return { lat, lng }
    } else {
      throw new Error('No coordinates found for destination')
    }
  } catch (error) {
    console.error('❌ Failed to get coordinates from Mapbox for', destination, ':', error)
    // Don't use fallback - throw error to let user know the destination is invalid
    throw new Error(`Unable to locate destination "${destination}". Please use a more specific location name.`)
  }
}


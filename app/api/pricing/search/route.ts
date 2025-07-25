import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { amadeusClient, FlightSearchParams } from '@/lib/amadeus-client'
import { bookingClient, HotelSearchParams } from '@/lib/booking-client'
import { priceCacheManager } from '@/lib/price-cache'
import { affiliateSystem } from '@/lib/affiliate-system'
import { z } from 'zod'

const flightSearchSchema = z.object({
  type: z.literal('flight'),
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  adults: z.number().min(1).max(9),
  children: z.number().min(0).max(9).optional(),
  infants: z.number().min(0).max(9).optional(),
  travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  maxResults: z.number().min(1).max(100).optional()
})

const hotelSearchSchema = z.object({
  type: z.literal('hotel'),
  destination: z.string(),
  checkinDate: z.string(),
  checkoutDate: z.string(),
  adults: z.number().min(1).max(20),
  children: z.number().min(0).max(10).optional(),
  rooms: z.number().min(1).max(10).optional(),
  currency: z.string().optional(),
  maxResults: z.number().min(1).max(100).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  starRating: z.array(z.number().min(1).max(5)).optional()
})

const searchSchema = z.union([flightSearchSchema, hotelSearchSchema])

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const searchParams = searchSchema.parse(body)

    console.log(`Price search request: ${searchParams.type}`, searchParams)

    // Check cache first
    const cachedResult = await priceCacheManager.getCachedPrice(
      searchParams.type,
      searchParams
    )

    if (cachedResult) {
      console.log(`Returning cached results for ${searchParams.type} search`)
      
      // Add affiliate links to cached data
      const dataWithAffiliateLinks = await Promise.all(
        cachedResult.data.map(async (item: any) => {
          const affiliateLink = await affiliateSystem.generateAffiliateLink(
            searchParams.type,
            {
              productId: item.id,
              originalUrl: item.bookingUrl || '',
              price: parseFloat(item.price.total),
              currency: item.price.currency,
              searchParams,
              userId: session?.user?.id
            }
          )

          return {
            ...item,
            bookingUrl: affiliateLink?.trackingUrl || item.bookingUrl,
            affiliateLinkId: affiliateLink?.id
          }
        })
      )

      return NextResponse.json({
        success: true,
        data: dataWithAffiliateLinks,
        cached: true,
        cachedAt: new Date(cachedResult.cachedAt).toISOString(),
        count: dataWithAffiliateLinks.length
      })
    }

    // Fetch fresh data
    let searchResult: any
    let searchData: any[] = []

    if (searchParams.type === 'flight') {
      if (!amadeusClient.isConfigured()) {
        console.warn('Amadeus API not configured, using mock data')
        // Return mock data or empty results
        return NextResponse.json({
          success: false,
          error: 'Flight search service temporarily unavailable',
          mockData: true
        }, { status: 503 })
      }

      searchResult = await amadeusClient.searchFlights(searchParams as FlightSearchParams)
      searchData = searchResult.data || []
    } else {
      searchResult = await bookingClient.searchHotels(searchParams as HotelSearchParams)
      searchData = searchResult.data || []
    }

    if (searchData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No results found for your search criteria',
        count: 0
      })
    }

    // Generate affiliate links for all results
    const dataWithAffiliateLinks = await Promise.all(
      searchData.map(async (item: any) => {
        const affiliateLink = await affiliateSystem.generateAffiliateLink(
          searchParams.type,
          {
            productId: item.id,
            originalUrl: item.bookingUrl || '',
            price: parseFloat(item.price.total),
            currency: item.price.currency,
            searchParams,
            userId: session?.user?.id
          }
        )

        return {
          ...item,
          bookingUrl: affiliateLink?.trackingUrl || item.bookingUrl,
          affiliateLinkId: affiliateLink?.id
        }
      })
    )

    // Cache the results (without affiliate links for consistency)
    await priceCacheManager.cachePrice(
      searchParams.type,
      searchParams,
      searchData,
      1800 // 30 minutes TTL
    )

    console.log(`Found ${dataWithAffiliateLinks.length} ${searchParams.type} results`)

    return NextResponse.json({
      success: true,
      data: dataWithAffiliateLinks,
      cached: false,
      searchedAt: new Date().toISOString(),
      count: dataWithAffiliateLinks.length,
      meta: searchResult.meta || {}
    })

  } catch (error) {
    console.error('Price search error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Search request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Price Search API',
    endpoints: {
      'POST /api/pricing/search': 'Search for flight or hotel prices'
    },
    supportedTypes: ['flight', 'hotel'],
    example: {
      flight: {
        type: 'flight',
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-03-15',
        returnDate: '2024-03-22',
        adults: 2,
        travelClass: 'ECONOMY'
      },
      hotel: {
        type: 'hotel',
        destination: 'New York',
        checkinDate: '2024-03-15',
        checkoutDate: '2024-03-18',
        adults: 2,
        rooms: 1
      }
    }
  })
}
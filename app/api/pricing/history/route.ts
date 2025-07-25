import { NextRequest, NextResponse } from 'next/server'
import { priceCacheManager } from '@/lib/price-cache'
import { z } from 'zod'

const historyQuerySchema = z.object({
  type: z.enum(['flight', 'hotel']),
  searchParams: z.object({
    // Flight params
    origin: z.string().optional(),
    destination: z.string().optional(),
    departureDate: z.string().optional(),
    returnDate: z.string().optional(),
    adults: z.number().optional(),
    children: z.number().optional(),
    travelClass: z.string().optional(),
    
    // Hotel params
    hotelDestination: z.string().optional(),
    checkinDate: z.string().optional(),
    checkoutDate: z.string().optional(),
    rooms: z.number().optional()
  }),
  days: z.number().min(1).max(90).optional().default(30)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = historyQuerySchema.parse(body)

    // Get price history from cache
    const history = await priceCacheManager.getPriceHistory(
      query.type,
      query.searchParams,
      query.days
    )

    // Transform history data for charts
    const chartData = history.map(entry => ({
      date: new Date(entry.timestamp).toISOString().split('T')[0],
      price: entry.price,
      currency: entry.currency,
      source: entry.source
    }))

    // Calculate statistics
    const prices = history.map(entry => entry.price).filter(price => price > 0)
    const stats = prices.length > 0 ? {
      lowest: Math.min(...prices),
      highest: Math.max(...prices),
      average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      current: prices[prices.length - 1] || 0,
      trend: prices.length > 1 ? 
        (prices[prices.length - 1] > prices[0] ? 'up' : 'down') : 'stable',
      changePercent: prices.length > 1 ? 
        ((prices[prices.length - 1] - prices[0]) / prices[0] * 100) : 0
    } : null

    return NextResponse.json({
      success: true,
      history: chartData,
      stats,
      count: chartData.length,
      period: {
        days: query.days,
        from: history.length > 0 ? new Date(Math.min(...history.map(h => h.timestamp))).toISOString() : null,
        to: history.length > 0 ? new Date(Math.max(...history.map(h => h.timestamp))).toISOString() : null
      }
    })

  } catch (error) {
    console.error('Error fetching price history:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid history query',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch price history'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Price History API',
    endpoints: {
      'POST /api/pricing/history': 'Get price history for search parameters'
    },
    example: {
      type: 'flight',
      searchParams: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-03-15',
        adults: 2
      },
      days: 30
    }
  })
}
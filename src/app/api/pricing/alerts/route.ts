import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { priceCacheManager } from '@/lib/price-cache'
import { z } from 'zod'

const createAlertSchema = z.object({
  type: z.enum(['flight', 'hotel']),
  title: z.string().min(1).max(100),
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
  targetPrice: z.number().positive()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's price alerts
    const alerts = await priceCacheManager.getUserAlerts(session.user.id)

    // Transform alerts for frontend
    const transformedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      title: `${alert.type === 'flight' ? 'Flight' : 'Hotel'} Alert`,
      searchParams: alert.searchParams,
      targetPrice: alert.targetPrice,
      currentPrice: alert.currentPrice,
      isActive: alert.isActive,
      createdAt: new Date(alert.createdAt).toISOString(),
      lastChecked: new Date(alert.lastChecked).toISOString(),
      alertsSent: alert.alertsSent
    }))

    return NextResponse.json({
      success: true,
      alerts: transformedAlerts,
      count: transformedAlerts.length
    })

  } catch (error) {
    console.error('Error fetching price alerts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch price alerts'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const alertData = createAlertSchema.parse(body)

    // Create price alert
    const alertId = await priceCacheManager.createPriceAlert(
      session.user.id,
      alertData.type,
      alertData.searchParams,
      alertData.targetPrice
    )

    if (!alertId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create price alert'
      }, { status: 500 })
    }

    console.log(`Created price alert ${alertId} for user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      alertId,
      message: 'Price alert created successfully'
    })

  } catch (error) {
    console.error('Error creating price alert:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid alert data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create price alert'
    }, { status: 500 })
  }
}